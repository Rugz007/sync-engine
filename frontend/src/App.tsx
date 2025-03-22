import "./App.css";

import React, { useState, useEffect } from "react";

// Define the shape of a Task
interface Task {
  id: number;
  content: string;
  transactionId?: number;
  isOptimistic?: boolean;
  isOptimisitcallyDeleted?: boolean;
}

// Define the shape of a Transaction
interface Transaction {
  id: number;
  task_id: number;
  operation: "create" | "update" | "delete" | "bootstrap";
  content: string;
  lastTransactionId?: number;
}

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [latestTransactionId, setLatestTransactionId] = useState<number>(0);
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

    setWs(socket);

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
        setTasks((prevTasks) => {
          const existingTask = prevTasks.find(
            (task) => task.transactionId === transaction.id
          );
          if (existingTask) {
            return prevTasks.map((task) =>
              task.transactionId === transaction.id
                ? { ...task, isOptimistic: false, id: transaction.task_id }
                : task
            );
          }
          return [
            ...prevTasks,
            { id: transaction.task_id, content: transaction.content },
          ];
        });
      } else if (transaction.operation === "update") {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === transaction.task_id
              ? { ...task, content: transaction.content, isOptimistic: false }
              : task
          )
        );
      } else if (transaction.operation === "delete") {
        setTasks((prevTasks) =>
          prevTasks.filter(
            (task) =>
              task.transactionId !== transaction.id &&
              task.id !== transaction.task_id
          )
        );
      }
    });
  };

  const handleAddTask = async () => {
    if (!newTask) return;

    // Send HTTP request to create a new task and log a transaction
    await fetch("http://localhost:8080/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Transaction-ID": (latestTransactionId + 1).toString(),
      },
      body: JSON.stringify({ content: newTask }),
    });

    setNewTask("");
    setTasks((prevTasks) => [
      ...prevTasks,
      {
        id: Math.random(),
        content: newTask,
        isOptimistic: true,
        transactionId: latestTransactionId + 1,
      },
    ]);
    setLatestTransactionId((prevId) => prevId + 1);
  };

  const handleUpdateTask = async (taskId: number, updatedContent: string) => {
    // Send HTTP request to update task and log a transaction
    await fetch("http://localhost:8080/tasks/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Transaction-ID": (latestTransactionId + 1).toString(),
      },
      body: JSON.stringify({ id: taskId, content: updatedContent }),
    });

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              content: updatedContent,
              isOptimistic: true,
              transactionId: latestTransactionId + 1,
            }
          : task
      )
    );
    setLatestTransactionId((prevId) => prevId + 1);
  };

  const handleDeleteTask = async (taskId: number) => {
    // Send HTTP request to delete task and log a transaction
    await fetch(`http://localhost:8080/tasks/delete?id=${taskId}`, {
      method: "DELETE",
      headers: {
        "Transaction-ID": (latestTransactionId + 1).toString(),
      },
    });

    setLatestTransactionId((prevId) => prevId + 1);
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              isOptimisitcallyDeleted: true,
              transactionId: latestTransactionId + 1,
            }
          : task
      )
    );
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
          onClick={handleAddTask}
          className="px-4 py-2  text-white font-semibold rounded-md"
        >
          Add Task
        </button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Tasks</h2>
      <ul className="space-y-4">
        {tasks
          .filter((task) => !task.isOptimisitcallyDeleted)
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
