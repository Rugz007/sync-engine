package main

import (
	"log"
	"net/http"

	"github.com/rs/cors"
	"github.com/rugz007/sync-engine/backend/internal/db"
)

func main() {
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},                            // Allow your frontend URL
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"}, // Allow methods
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	db.InitDB()

	http.HandleFunc("/ws", websocketHandler)
	http.HandleFunc("/tasks", createTaskHandler)
	http.HandleFunc("/tasks/update", updateTaskHandler)
	http.HandleFunc("/tasks/delete", deleteTaskHandler)
	http.HandleFunc("/tasks/read", getTasksHandler)
	http.HandleFunc("/tasks/read/single", getTaskHandler)

	go syncTransactions()
	go processTransactions() // Run transaction processing in a goroutine

	handler := c.Handler(http.DefaultServeMux)

	log.Println("Server started on :8080")
	log.Println("Server started on http://localhost:8080")
	if err := http.ListenAndServe(":8080", handler); err != nil {
		log.Fatal(err)
	}
}
