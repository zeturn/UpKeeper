package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/WorkPlace/UpKeeper/backend/database"
	"github.com/WorkPlace/UpKeeper/backend/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func getBasaltBaseURL() string { return getEnv("BASALT_BASE_URL", "http://localhost:8101") }
func getClientID() string      { return getEnv("BASALT_CLIENT_ID", "upkeeper") }
func getClientSecret() string  { return getEnv("BASALT_CLIENT_SECRET", "") }
func getRedirectURI() string   { return getEnv("BASALT_REDIRECT_URI", "http://localhost:8111/api/auth/callback") }
func getFrontendTarget() string { return getEnv("FRONTEND_URL", "http://localhost:5114") }
func getJwtSecret() []byte     { return []byte(getEnv("JWT_SECRET", "super-secret-upkeeper-key")) }

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// generateRandomString generates a url-safe base64 string
func generateRandomString(length int) string {
	b := make([]byte, length)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func generatePKCE() (verifier, challenge string) {
	verifier = generateRandomString(32)
	h := sha256.New()
	h.Write([]byte(verifier))
	challenge = base64.RawURLEncoding.EncodeToString(h.Sum(nil))
	return
}

func Login(c *fiber.Ctx) error {
	state := generateRandomString(16)
	verifier, challenge := generatePKCE()

	// Store state and verifier in HttpOnly cookies to cross-check later
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Expires:  time.Now().Add(10 * time.Minute),
		HTTPOnly: true,
	})
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_verifier",
		Value:    verifier,
		Expires:  time.Now().Add(10 * time.Minute),
		HTTPOnly: true,
	})

	q := url.Values{}
	q.Set("client_id", getClientID())
	q.Set("redirect_uri", getRedirectURI())
	q.Set("response_type", "code")
	q.Set("state", state)
	q.Set("code_challenge", challenge)
	q.Set("code_challenge_method", "S256")
	q.Set("scope", "openid profile email") // typical scopes

	authURL := fmt.Sprintf("%s/api/v1/oauth/authorize?%s", getBasaltBaseURL(), q.Encode())
	return c.Redirect(authURL, fiber.StatusFound)
}

func Callback(c *fiber.Ctx) error {
	code := c.Query("code")
	state := c.Query("state")
	
	cookieState := c.Cookies("oauth_state")
	verifier := c.Cookies("oauth_verifier")

	if state == "" || cookieState == "" || state != cookieState {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid state")
	}

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("client_id", getClientID())
	// Some IdPs require client secret even for PKCE if it's considered a confidential client.
	if getClientSecret() != "" {
		form.Set("client_secret", getClientSecret())
	}
	form.Set("redirect_uri", getRedirectURI())
	form.Set("code", code)
	form.Set("code_verifier", verifier)

	req, _ := http.NewRequest(http.MethodPost, fmt.Sprintf("%s/api/v1/oauth/token", getBasaltBaseURL()), strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Authentication failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return c.Status(fiber.StatusUnauthorized).SendString(fmt.Sprintf("Failed to get token: %s", string(bodyBytes)))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		IDToken     string `json:"id_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to parse token response")
	}

	// Fetch User info
	userInfoReq, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/api/v1/oauth/userinfo", getBasaltBaseURL()), nil)
	userInfoReq.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)
	uiResp, err := client.Do(userInfoReq)
	if err != nil || uiResp.StatusCode != http.StatusOK {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to get user info")
	}
	defer uiResp.Body.Close()

	var userInfo struct {
		Sub   string `json:"sub"` // subject/id from basalt
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(uiResp.Body).Decode(&userInfo); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to parse user info")
	}

	// Upsert User to DB
	var user models.User
	result := database.DB.Where("basalt_id = ?", userInfo.Sub).First(&user)
	if result.Error != nil {
		// New user
		user = models.User{
			BasaltID: userInfo.Sub,
			Email:    userInfo.Email,
			Name:     userInfo.Name,
		}
		database.DB.Create(&user)
	} else {
		// Update user info if changed
		user.Email = userInfo.Email
		user.Name = userInfo.Name
		database.DB.Save(&user)
	}

	// Create JWT for our upstream App
	claims := jwt.MapClaims{
		"id":    user.ID,
		"email": user.Email,
		"exp":   time.Now().Add(72 * time.Hour).Unix(),
	}

	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t, err := jwtToken.SignedString(getJwtSecret())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Could not login")
	}

	// Set local JWT as HTTPOnly Cookie
	c.Cookie(&fiber.Cookie{
		Name:     "upkeeper_session",
		Value:    t,
		Expires:  time.Now().Add(72 * time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})

	// Redirect to frontend
	return c.Redirect(getFrontendTarget(), fiber.StatusFound)
}

func Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "upkeeper_session",
		Value:    "",
		Expires:  time.Now().Add(-time.Hour),
		HTTPOnly: true,
		Path:     "/",
	})
	return c.JSON(fiber.Map{"message": "Logged out"})
}

// AuthMiddleware checking JWT token
func AuthMiddleware(c *fiber.Ctx) error {
	cookie := c.Cookies("upkeeper_session")
	if cookie == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	token, err := jwt.Parse(cookie, func(token *jwt.Token) (interface{}, error) {
		return getJwtSecret(), nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	claims := token.Claims.(jwt.MapClaims)
	userID := uint(claims["id"].(float64))
	
	// Set user id to context
	c.Locals("user_id", userID)
	return c.Next()
}

func Me(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	return c.JSON(user)
}
