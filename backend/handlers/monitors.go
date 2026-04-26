package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"github.com/WorkPlace/UpKeeper/backend/database"
	"github.com/WorkPlace/UpKeeper/backend/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func GetMonitors(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	var monitors []models.Monitor
	// Load monitors with their last 50 pings
	if err := database.DB.Preload("Pings", func(db *gorm.DB) *gorm.DB {
		return db.Order("timestamp desc").Limit(50)
	}).Where("user_id = ?", userID).Find(&monitors).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch monitors"})
	}

	return c.JSON(monitors)
}

func generateSlug(length int) string {
	bytes := make([]byte, length/2)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func CreateMonitor(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	monitor := new(models.Monitor)

	if err := c.BodyParser(monitor); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if monitor.URL == "" || monitor.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "URL and Name are required"})
	}
	
	if monitor.Interval < 10 {
		monitor.Interval = 60 // Minimum interval 10s, default 60
	}

	monitor.UserID = userID
	monitor.Status = "pending"
	monitor.PublicSlug = generateSlug(16)
	monitor.CreatedAt = time.Now()
	monitor.UpdatedAt = time.Now()

	if err := database.DB.Create(&monitor).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create monitor"})
	}

	return c.JSON(monitor)
}

func UpdateMonitor(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var monitor models.Monitor
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Monitor not found"})
	}

	updateData := new(models.Monitor)
	if err := c.BodyParser(updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	monitor.Name = updateData.Name
	monitor.URL = updateData.URL
	monitor.IsPublic = updateData.IsPublic
	if updateData.Interval >= 10 {
		monitor.Interval = updateData.Interval
	}
	monitor.UpdatedAt = time.Now()

	database.DB.Save(&monitor)
	return c.JSON(monitor)
}

func DeleteMonitor(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	result := database.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Monitor{})
	if result.Error != nil || result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Monitor not found"})
	}

	return c.JSON(fiber.Map{"message": "Deleted successfully"})
}

type UptimeStat struct {
	Total      int     `json:"total"`
	Up         int     `json:"up"`
	UptimePct  string  `json:"uptime_pct"`
}

type MonitorDetailsResponse struct {
	Monitor     models.Monitor `json:"monitor"`
	Uptime24h   UptimeStat     `json:"uptime_24h"`
	Uptime7d    UptimeStat     `json:"uptime_7d"`
	Uptime30d   UptimeStat     `json:"uptime_30d"`
	Uptime365d  UptimeStat     `json:"uptime_365d"`
	RecentPings []models.Ping  `json:"recent_pings"`
}

func getUptimeForDuration(monitorID uint, hours int) UptimeStat {
	var total int64
	var up int64
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)
	
	database.DB.Model(&models.Ping{}).Where("monitor_id = ? AND timestamp > ?", monitorID, cutoff).Count(&total)
	database.DB.Model(&models.Ping{}).Where("monitor_id = ? AND timestamp > ? AND is_up = ?", monitorID, cutoff, true).Count(&up)
	
	stat := UptimeStat{Total: int(total), Up: int(up), UptimePct: "100.00%"}
	if total > 0 {
		pct := float64(up) / float64(total) * 100
		stat.UptimePct = fmt.Sprintf("%.2f%%", pct)
	} else {
		stat.UptimePct = "--.--%"
	}
	return stat
}

func GetMonitorDetails(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var monitor models.Monitor
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Monitor not found"})
	}

	var recentPings []models.Ping
	database.DB.Where("monitor_id = ?", id).Order("timestamp desc").Limit(100).Find(&recentPings)

	// reverse recentPings for chronological graph
	for i, j := 0, len(recentPings)-1; i < j; i, j = i+1, j-1 {
		recentPings[i], recentPings[j] = recentPings[j], recentPings[i]
	}

	resp := MonitorDetailsResponse{
		Monitor:     monitor,
		Uptime24h:   getUptimeForDuration(monitor.ID, 24),
		Uptime7d:    getUptimeForDuration(monitor.ID, 24*7),
		Uptime30d:   getUptimeForDuration(monitor.ID, 24*30),
		Uptime365d:  getUptimeForDuration(monitor.ID, 24*365),
		RecentPings: recentPings,
	}

	return c.JSON(resp)
}

func TogglePauseMonitor(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var monitor models.Monitor
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&monitor).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Monitor not found"})
	}

	if monitor.Status == "paused" {
		monitor.Status = "pending" // will be checked shortly
	} else {
		monitor.Status = "paused"
	}

	database.DB.Save(&monitor)
	return c.JSON(monitor)
}

func GetPublicMonitorDetails(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid slug"})
	}

	var monitor models.Monitor
	if err := database.DB.Where("public_slug = ? AND is_public = ?", slug, true).First(&monitor).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Public monitor not found"})
	}

	var recentPings []models.Ping
	database.DB.Where("monitor_id = ?", monitor.ID).Order("timestamp desc").Limit(100).Find(&recentPings)

	// reverse recentPings for chronological graph
	for i, j := 0, len(recentPings)-1; i < j; i, j = i+1, j-1 {
		recentPings[i], recentPings[j] = recentPings[j], recentPings[i]
	}

	resp := MonitorDetailsResponse{
		Monitor:     monitor,
		Uptime24h:   getUptimeForDuration(monitor.ID, 24),
		Uptime7d:    getUptimeForDuration(monitor.ID, 24*7),
		Uptime30d:   getUptimeForDuration(monitor.ID, 24*30),
		Uptime365d:  getUptimeForDuration(monitor.ID, 24*365),
		RecentPings: recentPings,
	}

	return c.JSON(resp)
}
