package models

import (
	"time"
)

// User represents a user synchronized from BasaltPass
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	BasaltID  string    `gorm:"uniqueIndex;not null" json:"basalt_id"`
	Email     string    `gorm:"not null" json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Monitor represents a target URL to check
type Monitor struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	URL       string    `gorm:"size:2048;not null" json:"url"`
	Interval  int       `gorm:"not null;default:60" json:"interval"` // in seconds
	IsPublic  bool      `gorm:"not null;default:false" json:"is_public"`
	PublicSlug string   `gorm:"size:32;uniqueIndex" json:"public_slug"`
	Status    string    `gorm:"size:50;default:'pending'" json:"status"` // pending, up, down
	LastCheck time.Time `json:"last_check"`
	SSLExpiry *time.Time `json:"ssl_expiry"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Pings []Ping `json:"Pings" gorm:"constraint:OnDelete:CASCADE;"`
}

// Ping represents a single executed check
type Ping struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	MonitorID uint      `gorm:"index;not null" json:"monitor_id"`
	IsUp      bool      `gorm:"not null" json:"is_up"`
	LatencyMs int       `gorm:"not null" json:"latency_ms"` // Response time in milliseconds
	Timestamp time.Time `gorm:"index" json:"timestamp"`
	Error     string    `gorm:"type:text" json:"error"`
}
