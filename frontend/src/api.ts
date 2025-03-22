import { useState } from "react";

interface Task {
  id: number;
  content: string;
  isOptimistic?: boolean;
  isOptimisitcallyDeleted?: boolean;
  transactionId?: number;
}

// Define the shape of a Transaction
interface Transaction {
  id: number;
  task_id: number;
  operation: "create" | "update" | "delete" | "bootstrap";
  content: string;
  lastTransactionId?: number;
}

const useTaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [latestTransactionId, setLatestTransactionId] = useState<number>(0);

  const handleAddTask = async (newTask: Task) => {
    if (!newTask) return;

    await fetch("http://localhost:8080/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Transaction-ID": (latestTransactionId + 1).toString(),
      },
      body: JSON.stringify({
        content: newTask.content,
        id: newTask.id,
      }),
    });

    setTasks((prevTasks) => [...prevTasks, newTask]);
    setLatestTransactionId((prevId) => prevId + 1);
  };

  const handleUpdateTask = async (taskId: number, updatedContent: string) => {
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

  // Resolve Optimistic Add
  const resolveOptimisticAdd = (transaction: Transaction) => {
    // Check if a task with the same transactionId exists
    const taskExists = tasks.find((task) => task.id === transaction.task_id);
    if (taskExists) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === transaction.task_id
            ? {
                ...task,
                isOptimistic: false,
                transactionId: transaction.id,
                content: transaction.content,
              }
            : task
        )
      );
      return;
    } else {
      setTasks((prevTasks) => [
        ...prevTasks,
        {
          id: transaction.task_id,
          content: transaction.content,
          isOptimistic: false,
          transactionId: transaction.id,
        },
      ]);
    }
  };

  // Resolve Optimistic Update
  const resolveOptimisticUpdate = (
    transactionId: number,
    updatedContent: string
  ) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.transactionId === transactionId
          ? { ...task, content: updatedContent, isOptimistic: false }
          : task
      )
    );
  };

  // Resolve Optimistic Delete
  const resolveOptimisticDelete = (transactionId: number) => {
    setTasks((prevTasks) =>
      prevTasks.filter((task) => task.transactionId !== transactionId)
    );
  };

  return {
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
  };
};

export default useTaskManager;
