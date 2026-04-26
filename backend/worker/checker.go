package worker

import (
	"log"
	"net/http"
	"time"

	"github.com/WorkPlace/UpKeeper/backend/database"
	"github.com/WorkPlace/UpKeeper/backend/models"
)

func StartChecker() {
	ticker := time.NewTicker(2 * time.Second)
	go func() {
		for range ticker.C {
			checkDueMonitors()
		}
	}()
	log.Println("Background checker started")
}

func checkDueMonitors() {
	var monitors []models.Monitor
	
	// Find monitors where last check + interval < now
	// Since SQLite doesn't have a direct DATE_ADD that matches Go's interval perfectly in a simple query, 
	// we fetch all and check in-memory for simplicity given the scale
	if err := database.DB.Find(&monitors).Error; err != nil {
		log.Printf("Error fetching monitors: %v", err)
		return
	}

	now := time.Now()
	for _, m := range monitors {
		if m.Status == "paused" {
			continue
		}
		if m.Status == "pending" || now.Sub(m.LastCheck).Seconds() >= float64(m.Interval) {
			go pingMonitor(m, now)
		}
	}
}

func pingMonitor(m models.Monitor, checkTime time.Time) {
	start := time.Now()
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	req, err := http.NewRequest(http.MethodGet, m.URL, nil)
	if err != nil {
		recordResult(m.ID, false, 0, checkTime, err.Error(), nil)
		return
	}
	req.Header.Set("User-Agent", "UpKeeper/1.0 (+https://github.com/WorkPlace/UpKeeper)")

	resp, err := client.Do(req)
	latency := time.Since(start).Milliseconds()

	if err != nil {
		recordResult(m.ID, false, int(latency), checkTime, err.Error(), nil)
		return
	}
	defer resp.Body.Close()

	var sslExpiry *time.Time
	if resp.TLS != nil && len(resp.TLS.PeerCertificates) > 0 {
		cert := resp.TLS.PeerCertificates[0]
		sslExpiry = &cert.NotAfter
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		recordResult(m.ID, true, int(latency), checkTime, "", sslExpiry)
	} else {
		recordResult(m.ID, false, int(latency), checkTime, "HTTP Status "+resp.Status, sslExpiry)
	}
}

func recordResult(monitorIDE uint, isUp bool, latency int, checkTime time.Time, errMsg string, sslExpiry *time.Time) {
	ping := models.Ping{
		MonitorID: monitorIDE,
		IsUp:      isUp,
		LatencyMs: latency,
		Timestamp: checkTime,
		Error:     errMsg,
	}

	// Save Ping
	if err := database.DB.Create(&ping).Error; err != nil {
		log.Printf("Failed to record ping: %v", err)
		return
	}

	// Update Monitor status
	statusStr := "up"
	if !isUp {
		statusStr = "down"
	}

	updates := map[string]interface{}{
		"status":     statusStr,
		"last_check": checkTime,
	}
	if sslExpiry != nil {
		updates["ssl_expiry"] = *sslExpiry
	}

	database.DB.Model(&models.Monitor{}).Where("id = ?", monitorIDE).Updates(updates)
}
