package database

import (
	"log"
	"os"
	"path/filepath"

	"github.com/WorkPlace/UpKeeper/backend/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "upkeeper.db"
	}

	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if dir != "." {
		os.MkdirAll(dir, 0755)
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	err = db.AutoMigrate(&models.User{}, &models.Monitor{}, &models.Ping{})
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}

	DB = db
	log.Println("Database connected and migrated successfully")
}
