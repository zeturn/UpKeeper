package main

import (
	"log"
	"os"

	"github.com/WorkPlace/UpKeeper/backend/database"
	"github.com/WorkPlace/UpKeeper/backend/handlers"
	"github.com/WorkPlace/UpKeeper/backend/worker"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	database.InitDB()
	worker.StartChecker()

	app := fiber.New(fiber.Config{
		AppName: "UpKeeper API",
	})

	app.Use(logger.New())

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5114"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     frontendURL,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	// Auth routes
	auth := app.Group("/api/auth")
	auth.Get("/login", handlers.Login)
	auth.Get("/callback", handlers.Callback)
	auth.Post("/logout", handlers.Logout)

	// Protected Auth Route
	auth.Use(handlers.AuthMiddleware)
	auth.Get("/me", handlers.Me)

	// Public Routes
	public := app.Group("/api/public")
	public.Get("/status/:slug", handlers.GetPublicMonitorDetails)

	// Monitors CRUD
	api := app.Group("/api/monitors", handlers.AuthMiddleware)
	api.Get("/", handlers.GetMonitors)
	api.Get("/:id/details", handlers.GetMonitorDetails)
	api.Post("/", handlers.CreateMonitor)
	api.Put("/:id", handlers.UpdateMonitor)
	api.Put("/:id/pause", handlers.TogglePauseMonitor)
	api.Delete("/:id", handlers.DeleteMonitor)

	log.Fatal(app.Listen(":8111"))
}
