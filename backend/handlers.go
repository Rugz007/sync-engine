package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/rugz007/sync-engine/backend/internal/db"
)

type Task struct {
	ID      string `json:"id" `
	Content string `json:"content"`
}

func createTaskHandler(w http.ResponseWriter, r *http.Request) {
	transactionID := r.Header.Get("Transaction-ID")
	if transactionID == "" {
		http.Error(w, "Missing Transaction-ID header", http.StatusBadRequest)
		return
	}

	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		fmt.Printf("Error: %v\n", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	_, err := db.DB.Exec("INSERT INTO transactions (id, task_id, operation, content) VALUES (?, ?, ?, ?)", transactionID, task.ID, "create", task.Content)
	if err != nil {
		http.Error(w, "Failed to log transaction", http.StatusInternalServerError)
		fmt.Printf("Error: %v\n", err)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"message": "Transaction created"})
}

func updateTaskHandler(w http.ResponseWriter, r *http.Request) {
	transactionID := r.Header.Get("Transaction-ID")
	if transactionID == "" {
		http.Error(w, "Missing Transaction-ID header", http.StatusBadRequest)
		return
	}

	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if task.ID == "" {
		http.Error(w, "Missing or invalid task ID in request body", http.StatusBadRequest)
		return
	}

	_, err := db.DB.Exec("INSERT INTO transactions (id, task_id, operation, content) VALUES (?, ?, ?, ?)", transactionID, task.ID, "update", task.Content)
	if err != nil {
		http.Error(w, "Failed to log transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"message": "Transaction created"})
}

func deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	transactionID := r.Header.Get("Transaction-ID")
	if transactionID == "" {
		http.Error(w, "Missing Transaction-ID header", http.StatusBadRequest)
		return
	}

	idStr := r.URL.Query().Get("id")

	_, err := db.DB.Exec("INSERT INTO transactions (id, task_id, operation) VALUES (?, ?, ?)", transactionID, idStr, "delete")
	if err != nil {
		http.Error(w, "Failed to log transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"message": "Transaction created"})
}

// Read All Tasks
func getTasksHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.DB.Query("SELECT id, content FROM tasks")
	if err != nil {
		http.Error(w, "Failed to fetch tasks", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var task Task
		if err := rows.Scan(&task.ID, &task.Content); err != nil {
			fmt.Printf("Error: %v\n", err)
			http.Error(w, "Error reading task", http.StatusInternalServerError)
			return
		}
		tasks = append(tasks, task)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// Read Single Task
func getTaskHandler(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var task Task
	err = db.DB.QueryRow("SELECT id, content FROM tasks WHERE id = ?", id).Scan(&task.ID, &task.Content)
	if err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}
