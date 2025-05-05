import { useCallback, useState } from "react";

interface Task {
  id: string;
  content: string;
  isOptimistic?: boolean;
  isOptimisticallyDeleted?: boolean;
  transactionId?: number;
}

// Define the shape of a Transaction
export interface Transaction {
  id: number;
  task_id: string;
  operation: "create" | "update" | "delete" | "bootstrap";
  content: string;
  lastTransactionId?: number;
}

export const useTaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [latestTransactionId, setLatestTransactionId] = useState<number>(0);

  const handleAddTask = useCallback(
    async (newTask: Task) => {
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
    },
    [latestTransactionId, setTasks]
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, updatedContent: string) => {
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
    },
    [latestTransactionId, setTasks]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
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
                isOptimisticallyDeleted: true,
                transactionId: latestTransactionId + 1,
              }
            : task
        )
      );
    },
    [latestTransactionId, setTasks]
  );

  // Resolve Optimistic Add
  const resolveOptimisticAdd = useCallback(
    (transaction: Transaction) => {
      // Always use the functional update pattern to access the latest state
      setTasks((prevTasks) => {
        // Check if a task with the same id exists
        const taskExists = prevTasks.find(
          (task) => task.id === transaction.task_id
        );
        console.log(transaction, taskExists, prevTasks);

        if (taskExists) {
          return prevTasks.map((task) =>
            task.id === transaction.task_id
              ? {
                  ...task,
                  isOptimistic: false,
                  transactionId: transaction.id,
                  content: transaction.content,
                }
              : task
          );
        } else {
          return [
            ...prevTasks,
            {
              id: transaction.task_id,
              content: transaction.content,
              isOptimistic: false,
              transactionId: transaction.id,
            },
          ];
        }
      });
    },
    [setTasks]
  ); // Remove tasks from the dependency array
  // Resolve Optimistic Update
  const resolveOptimisticUpdate = useCallback(
    (transaction: Transaction) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === transaction.task_id
            ? { ...task, content: transaction.content, isOptimistic: false }
            : task
        )
      );
    },
    [setTasks]
  );

  // Resolve Optimistic Delete
  const resolveOptimisticDelete = useCallback(
    (transaction: Transaction) => {
      setTasks((prevTasks) =>
        prevTasks.filter((task) => task.id !== transaction.task_id)
      );
    },
    [setTasks]
  );

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