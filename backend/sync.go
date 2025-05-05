package main

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rugz007/sync-engine/backend/internal/db"
)

type Transaction struct {
	ID        int     `json:"id"`
	TaskID    string  `json:"task_id"`
	Operation string  `json:"operation"`
	Content   *string `json:"content"` // Content can be nullable
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var clients = make(map[*websocket.Conn]bool)
var mu sync.Mutex
var transactionChannel = make(chan []Transaction, 100) // Buffered channel for transactions

func processTransactions() {
	for {

		tx, err := db.DB.Begin()
		if err != nil {
			log.Println("Error starting transaction:", err)
			continue
		}

		rows, err := tx.Query("SELECT id, task_id, operation, content FROM transactions WHERE completed = FALSE ORDER BY id ASC")
		if err != nil {
			log.Println("Error fetching transactions:", err)
			tx.Rollback()
			continue
		}

		var transactions []Transaction
		for rows.Next() {
			var t Transaction
			if err := rows.Scan(&t.ID, &t.TaskID, &t.Operation, &t.Content); err != nil {
				log.Println("Error reading transaction:", err)
				rows.Close()
				tx.Rollback()
				continue
			}
			transactions = append(transactions, t)
		}
		rows.Close()

		// Process transactions and mark as completed
		for _, t := range transactions {
			switch t.Operation {
			case "create":
				_, err := tx.Exec("INSERT INTO tasks (id, content) VALUES (?, ?)", t.TaskID, t.Content)
				if err == nil {
					_, _ = tx.Exec("UPDATE transactions SET completed = TRUE WHERE id = ?", t.ID)
				} else {
					log.Println("Error processing create operation:", err)
					tx.Rollback()
					continue
				}
			case "update":
				_, err := tx.Exec("UPDATE tasks SET content = ? WHERE id = ?", t.Content, t.TaskID)
				if err == nil {
					_, _ = tx.Exec("UPDATE transactions SET completed = TRUE WHERE id = ?", t.ID)
				} else {
					log.Println("Error processing update operation:", err)
					tx.Rollback()
					continue
				}
			case "delete":
				_, err := tx.Exec("DELETE FROM tasks WHERE id = ?", t.TaskID)
				if err == nil {
					_, _ = tx.Exec("UPDATE transactions SET completed = TRUE WHERE id = ?", t.ID)
				} else {
					log.Println("Error processing delete operation:", err)
					tx.Rollback()
					continue
				}
			}
		}

		// Commit the transaction
		if err := tx.Commit(); err != nil {
			log.Println("Error committing transaction:", err)
			continue
		}

		// Send completed transactions to the sync service
		transactionChannel <- transactions
	}
}
func syncTransactions() {
	for {
		select {
		case transactions := <-transactionChannel:
			// Send completed transactions to WebSocket clients
			if len(transactions) > 0 {
				mu.Lock()
				for client := range clients {
					err := client.WriteJSON(transactions)
					if err != nil {
						log.Println("WebSocket error:", err)
						client.Close()
						delete(clients, client)
					}
				}
				mu.Unlock()
			}
		}
	}
}

func websocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	mu.Lock()
	clients[conn] = true
	mu.Unlock()

	log.Println("New WebSocket connection")

	defer func() {
		mu.Lock()
		delete(clients, conn)
		mu.Unlock()
		conn.Close()
		log.Println("WebSocket connection closed")
	}()

	// send the latest transactionID to the client
	var lastTransactionID int
	err = db.DB.QueryRow("SELECT COALESCE(MAX(id), 0) FROM transactions").Scan(&lastTransactionID)
	if err != nil {
		log.Println("Failed to fetch latest transaction ID")
		return
	}
	err = conn.WriteJSON(map[string]int{"lastTransactionID": lastTransactionID})
	if err != nil {
		log.Println("WebSocket write error:", err)
		return
	}

	// Keep connection alive by reading messages
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			log.Println("WebSocket read error:", err)
			break
		}
		// You can handle incoming messages here if needed
	}
}
