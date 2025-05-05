import { Transaction, useTaskManager } from "./hooks";
import "./App.css";
import { v4 as uuid } from "uuid";
import React, { useState, useEffect } from "react";

// Define the shape of a Transaction

const App: React.FC = () => {
  const [newTask, setNewTask] = useState<string>("");
  const {
    tasks,
    setTasks,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    resolveOptimisticAdd,
    resolveOptimisticUpdate,
    resolveOptimisticDelete,
    latestTransactionId,
    setLatestTransactionId,
  } = useTaskManager();
  const fetchTasks = async () => {
    try {
      const response = await fetch("http://localhost:8080/tasks/read"); // Adjust to your API endpoint
      if (response.ok) {
        const data = await response.json();
        if (!data) return;
        setTasks(data);
      } else {
        console.error("Error fetching tasks:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };
  useEffect(() => {
    // WebSocket connection to the backend
    fetchTasks(); // Fetch tasks when the component mounts

    const socket = new WebSocket("ws://localhost:8080/ws");

    socket.onopen = () => {
      console.log("WebSocket connected");
    };

    socket.onmessage = (event: MessageEvent) => {
      const parsedData = JSON.parse(event.data);
      if (parsedData.lastTransactionID !== undefined) {
        setLatestTransactionId(parsedData.lastTransactionID);
      } else {
        const transactions: Transaction[] = parsedData;
        updateTasksFromTransactions(transactions);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    socket.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
    };


    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  const updateTasksFromTransactions = (transactions: Transaction[]) => {
    console.log("Updating tasks from transactions:", transactions);
    transactions.forEach((transaction) => {
      console.log(
        "Processing transaction:",
        transaction.id,
        latestTransactionId,
        transaction.task_id,
        transaction.operation,
        transaction.content
      );

      // check if received transaction ID is greater than the latest transaction ID
      if (transaction.id > latestTransactionId) {
        setLatestTransactionId(transaction.id);
      }
      if (transaction.operation === "create") {
        resolveOptimisticAdd(transaction);
      } else if (transaction.operation === "update") {
        resolveOptimisticUpdate(transaction);
      } else if (transaction.operation === "delete") {
        resolveOptimisticDelete(transaction);
      }
    });
  };

  return (
    <div className="min-h-screen text-white p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">Task Manager</h1>

      <div className="mb-4 text-center">
        <pre className="text-sm text-gray-400">
          Transaction ID: {latestTransactionId}
        </pre>
      </div>

      <div className="mb-6 flex justify-center items-center gap-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task"
          className="w-full max-w-md px-4 py-2 rounded-md text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => {
            const newID = uuid();
            handleAddTask({
              id: newID,
              content: newTask,
              isOptimistic: true,
            });
            setNewTask("");
          }}
          className="px-4 py-2  text-white font-semibold rounded-md"
        >
          Add Task
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Tasks</h2>
      <ul className="space-y-4">
        {tasks
          .filter((task) => !task.isOptimisticallyDeleted)
          .map((task) => (
            <li
              key={task.id}
              className="flex justify-between items-center bg-neutral-800 p-4 rounded-md shadow-md"
            >
              <span
                className={`flex-1 ${
                  task.isOptimistic ? "underline text-yellow-400" : ""
                }`}
              >
                {task.content}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleUpdateTask(
                      task.id,
                      prompt("Update task:", task.content) || ""
                    )
                  }
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  Update
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default App;
