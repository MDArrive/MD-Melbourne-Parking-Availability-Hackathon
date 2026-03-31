import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Button,
  Table,
  Badge,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
} from "react-bootstrap";
import { Plus, Copy } from "lucide-react";

// Import backend types (adjust path if needed, or define locally/shared)
// Assuming types might be manually defined or generated elsewhere if not directly importable
// For demonstration, let's define simplified versions inline or assume they exist
// import { ExampleTask, TaskStatus, TaskPriority } from "../../../../../backend/src/types/prisma-types"; // Keep commented out

import { fetchApi } from "../../../utils/apiClient"; // Path should be correct relative to new location

// UNCOMMENTED: Manual type definitions based on Prisma schema:
enum TaskStatus {
  UPCOMING = 'UPCOMING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}
enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}
interface ExampleTask {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string; // Dates will be strings from JSON
  updatedAt: string;
}

const priorityVariantMap: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: "success",
  [TaskPriority.MEDIUM]: "warning",
  [TaskPriority.HIGH]: "danger",
};

const statusMap: Record<TaskStatus, string> = {
  [TaskStatus.UPCOMING]: "Upcoming",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.COMPLETED]: "Completed",
};

const promptBlockStyle: React.CSSProperties = {
  background: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '6px',
  padding: '10px 14px',
  fontSize: '0.9rem',
  lineHeight: '1.5',
  cursor: 'pointer',
};

const CopyablePrompt = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={promptBlockStyle} onClick={handleCopy} title="Click to copy">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <span>{children}</span>
        <span className="text-muted flex-shrink-0" style={{ fontSize: '0.75rem' }}>
          {copied ? 'Copied!' : <Copy size={14} />}
        </span>
      </div>
    </div>
  );
};

interface TaskTableProps {
  tasks: ExampleTask[];
}

const TaskTable = ({ tasks }: TaskTableProps) => {
  return (
    <Table responsive>
      <thead>
        <tr>
          <th className="align-middle w-25px">
          </th>
          <th className="align-middle w-50">Name</th>
          <th className="align-middle d-none d-xl-table-cell">Description</th>
          <th className="align-middle d-none d-xxl-table-cell">Created</th>
          <th className="align-middle">Priority</th>
          <th className="align-middle text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td>
            </td>
            <td>
              <strong>{task.name}</strong>
            </td>
            <td className="d-none d-xl-table-cell">{task.description || '-'}</td>
            <td className="d-none d-xxl-table-cell">{new Date(task.createdAt).toLocaleDateString()}</td>
            <td>
              <Badge bg="" className={`badge-subtle-${priorityVariantMap[task.priority]}`}>
                {task.priority}
              </Badge>
            </td>
            <td className="text-end">
              {" "}
              <Button variant="light" size="sm">View</Button>{" "}
            </td>
          </tr>
        ))}
        {tasks.length === 0 && (
            <tr>
                <td colSpan={6} className="text-center p-3">No tasks in this category.</td>
            </tr>
        )}
      </tbody>
    </Table>
  );
};

interface TaskBoardProps {
  title: string;
  tasks: ExampleTask[];
}

const TaskBoard = ({ title, tasks }: TaskBoardProps) => {
  return (
    <Card className="mb-3">
      <Card.Body>
        <Row className="mb-2">
          <Col xs={6}>
            <Card.Title as="h5">{title}</Card.Title>
          </Col>
          <Col xs={6}>
            <div className="text-sm-end">
              <Button
                variant="primary"
                size="sm"
              >
                <Plus size={18} /> New Task
              </Button>
            </div>
          </Col>
        </Row>
        <TaskTable tasks={tasks} />
      </Card.Body>
    </Card>
  );
};

const ExerciseTaskList = () => {
  const [tasks, setTasks] = useState<ExampleTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showIntroAlert, setShowIntroAlert] = useState<boolean>(true);

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTasks = await fetchApi<ExampleTask[]>('/exercises/tasks');
        setTasks(fetchedTasks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, []);

  const upcomingTasks = tasks.filter((task) => task.status === TaskStatus.UPCOMING);
  const inProgressTasks = tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS);
  const completedTasks = tasks.filter((task) => task.status === TaskStatus.COMPLETED);

  return (
    <React.Fragment>
      <Helmet title="Task List Exercise" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3">Task List Exercise</h1>

        {showIntroAlert && (
          <Card className="mb-4 border-primary">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="mb-2">Welcome to the Task List Exercise!</h5>
                  <p className="mb-2">
                    This page shows a task list connected to a backend API. The tasks below are
                    fetched live from the database — but some features are missing. Your job is
                    to add them using Claude.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowIntroAlert(false)}
                />
              </div>

              <div className="rounded p-3 mb-3" style={{ background: '#d1e7dd' }}>
                <strong>How it works:</strong> Copy each task below (click the block to copy) and
                paste it into Claude. Claude will make the code changes for you. After each task,
                refresh this page to see your changes.
              </div>

              <h6 className="mb-3">Tasks</h6>

              <div className="mb-3">
                <div className="fw-semibold mb-1">1. Create Tasks</div>
                <CopyablePrompt>Connect the 'New Task' button to the POST endpoint so users can create new tasks. The backend API already supports POST to /api/exercises/tasks.</CopyablePrompt>
              </div>

              <div className="mb-3">
                <div className="fw-semibold mb-1">2. Update Task Status</div>
                <CopyablePrompt>Add a checkbox or button to each task that lets users mark it as complete or incomplete by calling PUT /api/exercises/tasks/:id with a status update.</CopyablePrompt>
              </div>

              <div className="mb-3">
                <div className="fw-semibold mb-1">3. Delete Tasks</div>
                <CopyablePrompt>Add a delete button to each task that removes it by calling DELETE /api/exercises/tasks/:id. Show a confirmation before deleting.</CopyablePrompt>
              </div>

              <div className="mb-0">
                <div className="fw-semibold mb-1">4. Edit Tasks</div>
                <CopyablePrompt>Replace the 'View' button with an 'Edit' button that opens a form to edit the task name, description, and priority, then saves via PUT /api/exercises/tasks/:id.</CopyablePrompt>
              </div>

              <p className="text-muted mt-3 mb-0" style={{ fontSize: '0.85rem' }}>
                <strong>Tip:</strong> If something breaks, just tell Claude what happened
                (e.g. "I got an error when I clicked the button") and it will fix it.
              </p>
            </Card.Body>
          </Card>
        )}

        {isLoading && (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {error && (
          <Alert variant="danger">
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {!isLoading && !error && (
          <>
            <TaskBoard title={statusMap[TaskStatus.UPCOMING]} tasks={upcomingTasks} />
            <TaskBoard title={statusMap[TaskStatus.IN_PROGRESS]} tasks={inProgressTasks} />
            <TaskBoard title={statusMap[TaskStatus.COMPLETED]} tasks={completedTasks} />
          </>
        )}
      </Container>
    </React.Fragment>
  );
};

export default ExerciseTaskList; 