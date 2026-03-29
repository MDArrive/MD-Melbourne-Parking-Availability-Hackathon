import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Button,
  Badge,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Modal,
  Form,
} from "react-bootstrap";
import { Plus, GripVertical } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-regular-svg-icons";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { fetchApi } from "../../../utils/apiClient";

enum TaskStatus {
  UPCOMING = "UPCOMING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}
enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}
interface ExampleTask {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
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

const STATUSES: TaskStatus[] = [
  TaskStatus.UPCOMING,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
];

// Rainbow CSS injected via style tag
const rainbowStyles = `
@keyframes rainbow-bg {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes rainbow-border {
  0%   { border-color: #ff0000; }
  14%  { border-color: #ff8800; }
  28%  { border-color: #ffff00; }
  42%  { border-color: #00ff00; }
  57%  { border-color: #0088ff; }
  71%  { border-color: #4400ff; }
  85%  { border-color: #aa00ff; }
  100% { border-color: #ff0000; }
}
@keyframes rainbow-text {
  0%   { color: #ff0000; }
  14%  { color: #ff8800; }
  28%  { color: #ffff00; }
  42%  { color: #00ff00; }
  57%  { color: #0088ff; }
  71%  { color: #4400ff; }
  85%  { color: #aa00ff; }
  100% { color: #ff0000; }
}
@keyframes rainbow-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-4px); }
}
.rainbow-page-title {
  background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #4400ff, #aa00ff, #ff0000);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: rainbow-shimmer 3s linear infinite;
  font-weight: 700 !important;
}
.rainbow-column-card {
  border: 2px solid #ff0000;
  animation: rainbow-border 4s linear infinite;
  border-radius: 12px !important;
  overflow: hidden;
}
.rainbow-column-card .card-body {
  background: linear-gradient(135deg,
    rgba(255,0,0,0.04),
    rgba(255,136,0,0.04),
    rgba(255,255,0,0.04),
    rgba(0,255,0,0.04),
    rgba(0,136,255,0.04),
    rgba(68,0,255,0.04),
    rgba(170,0,255,0.04)
  );
  background-size: 400% 400%;
  animation: rainbow-bg 8s ease infinite;
}
.rainbow-column-header {
  animation: rainbow-text 4s linear infinite;
  font-weight: 700 !important;
}
.rainbow-task-card {
  border: 2px solid transparent;
  border-radius: 8px !important;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #4400ff, #aa00ff) border-box;
  background-size: 100% 100%, 300% 100%;
  animation: rainbow-shimmer 4s linear infinite, float 3s ease-in-out infinite;
  transition: transform 0.2s, box-shadow 0.2s;
}
.rainbow-task-card:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 4px 15px rgba(255,0,0,0.15),
    0 4px 15px rgba(0,136,255,0.15),
    0 4px 15px rgba(170,0,255,0.15);
}
.rainbow-badge {
  background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #4400ff, #aa00ff) !important;
  background-size: 200% auto;
  animation: rainbow-shimmer 2s linear infinite;
  color: white !important;
  font-weight: 600;
  border: none !important;
}
.rainbow-btn {
  background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #4400ff, #aa00ff, #ff0000) !important;
  background-size: 300% auto;
  animation: rainbow-shimmer 3s linear infinite;
  border: none !important;
  color: white !important;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}
.rainbow-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 3px 12px rgba(170,0,255,0.4);
}
.rainbow-alert {
  border: 2px solid transparent;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #4400ff, #aa00ff) border-box;
  background-size: 100% 100%, 300% 100%;
  animation: rainbow-shimmer 4s linear infinite;
}
.rainbow-drop-active {
  outline: 3px dashed;
  animation: rainbow-border 1s linear infinite;
  background: linear-gradient(135deg,
    rgba(255,0,0,0.06),
    rgba(255,255,0,0.06),
    rgba(0,255,0,0.06),
    rgba(0,136,255,0.06),
    rgba(170,0,255,0.06)
  ) !important;
  background-size: 400% 400% !important;
}
.rainbow-grip {
  animation: rainbow-text 2s linear infinite;
}
.rainbow-count {
  background: linear-gradient(90deg, #4400ff, #aa00ff, #ff0000) !important;
  background-size: 200% auto;
  animation: rainbow-shimmer 2s linear infinite;
}
.rainbow-overlay-card {
  border: 3px solid transparent;
  border-radius: 8px !important;
  background:
    linear-gradient(white, white) padding-box,
    linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #4400ff, #aa00ff) border-box;
  background-size: 100% 100%, 300% 100%;
  animation: rainbow-shimmer 2s linear infinite;
  box-shadow:
    0 8px 30px rgba(255,0,0,0.2),
    0 8px 30px rgba(0,136,255,0.2),
    0 8px 30px rgba(170,0,255,0.2);
}
`;

// --- Draggable Task Card ---

interface TaskCardProps {
  task: ExampleTask;
  isDragOverlay?: boolean;
}

const TaskCard = ({ task, isDragOverlay }: TaskCardProps) => {
  return (
    <div
      className={`d-flex align-items-center p-2 mb-2 rounded ${isDragOverlay ? "rainbow-overlay-card" : "rainbow-task-card"}`}
    >
      <GripVertical size={16} className="rainbow-grip me-2 flex-shrink-0" style={{ cursor: "grab" }} />
      <div className="flex-grow-1 min-w-0">
        <strong className="d-block text-truncate">{task.name}</strong>
        {task.description && (
          <small className="text-muted text-truncate d-none d-md-block">{task.description}</small>
        )}
      </div>
      <Badge className="rainbow-badge ms-2 flex-shrink-0">
        {task.priority}
      </Badge>
    </div>
  );
};

interface SortableTaskCardProps {
  task: ExampleTask;
}

const SortableTaskCard = ({ task }: SortableTaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
};

// --- Droppable Column ---

interface StatusColumnProps {
  status: TaskStatus;
  tasks: ExampleTask[];
  onNewTask: (status: TaskStatus) => void;
}

const StatusColumn = ({ status, tasks, onNewTask }: StatusColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <Card
      className={`mb-3 rainbow-column-card ${isOver ? "rainbow-drop-active" : ""}`}
      style={{ minHeight: 120 }}
    >
      <Card.Body>
        <Row className="mb-2">
          <Col xs={6}>
            <Card.Title as="h5" className="rainbow-column-header">
              {statusMap[status]}{" "}
              <Badge pill className="rainbow-count ms-1">
                {tasks.length}
              </Badge>
            </Card.Title>
          </Col>
          <Col xs={6}>
            <div className="text-sm-end">
              <Button className="rainbow-btn" size="sm" onClick={() => onNewTask(status)}>
                <Plus size={18} /> New Task
              </Button>
            </div>
          </Col>
        </Row>
        <div ref={setNodeRef} style={{ minHeight: 40 }}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="text-center py-3" style={{ opacity: 0.7 }}>
              <span className="rainbow-column-header">
                {isOver ? "Drop here!" : "No tasks"}
              </span>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

// --- Main Component ---

const ExerciseTaskList = () => {
  const [tasks, setTasks] = useState<ExampleTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showIntroAlert, setShowIntroAlert] = useState<boolean>(true);
  const [activeTask, setActiveTask] = useState<ExampleTask | null>(null);

  // New Task modal state
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>(TaskStatus.UPCOMING);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTasks = await fetchApi<ExampleTask[]>("/exercises/tasks");
      setTasks(fetchedTasks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // --- Drag handlers ---

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let overStatus: TaskStatus | undefined;
    if (STATUSES.includes(overId as TaskStatus)) {
      overStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      overStatus = overTask?.status;
    }

    if (!overStatus) return;

    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj || activeTaskObj.status === overStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: overStatus! } : t))
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active } = event;
    const activeId = active.id as string;
    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    try {
      await fetchApi(`/exercises/tasks/${activeId}`, {
        method: "PUT",
        body: JSON.stringify({ status: task.status }),
      });
    } catch {
      await loadTasks();
    }
  };

  // --- New task handlers ---

  const handleOpenNewTask = (status: TaskStatus) => {
    setNewTaskName("");
    setNewTaskPriority(TaskPriority.MEDIUM);
    setNewTaskStatus(status);
    setCreateError(null);
    setShowNewTaskModal(true);
  };

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      await fetchApi("/exercises/tasks", {
        method: "POST",
        body: JSON.stringify({
          name: newTaskName.trim(),
          priority: newTaskPriority,
          status: newTaskStatus,
        }),
      });
      setShowNewTaskModal(false);
      await loadTasks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <React.Fragment>
      <style>{rainbowStyles}</style>
      <Helmet title="Task List Exercise" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3 rainbow-page-title">Task List Exercise</h1>

        {showIntroAlert && (
          <Alert
            variant="primary"
            className="rainbow-alert"
            onClose={() => setShowIntroAlert(false)}
            dismissible
          >
            <div className="alert-icon">
              <FontAwesomeIcon icon={faBell} fixedWidth />
            </div>
            <div className="alert-message">
              <strong className="rainbow-page-title">Welcome to the Task List Exercise!</strong>
              <p className="mb-2">
                This page demonstrates a basic task list connected to a backend API.
                The tasks you see below are fetched live from the database via
                <code>/api/exercises/tasks</code>.
              </p>
              <p className="mb-1">
                Drag and drop tasks between columns to change their status.
                Use the <strong>New Task</strong> button to create tasks.
              </p>
            </div>
          </Alert>
        )}

        {isLoading && (
          <div className="text-center">
            <Spinner animation="border" role="status" className="rainbow-grip">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <Row>
              {STATUSES.map((status) => (
                <Col key={status} md={4}>
                  <StatusColumn
                    status={status}
                    tasks={tasks.filter((t) => t.status === status)}
                    onNewTask={handleOpenNewTask}
                  />
                </Col>
              ))}
            </Row>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </Container>

      {/* New Task Modal */}
      <Modal show={showNewTaskModal} onHide={() => setShowNewTaskModal(false)}>
        <Modal.Header closeButton className="rainbow-alert">
          <Modal.Title className="rainbow-page-title">New Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createError && (
            <Alert variant="danger" className="mb-3">
              {createError}
            </Alert>
          )}
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateTask();
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter task name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                autoFocus
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Priority</Form.Label>
              <Form.Select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              >
                <option value={TaskPriority.LOW}>Low</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.HIGH}>High</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={newTaskStatus}
                onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)}
              >
                <option value={TaskStatus.UPCOMING}>Upcoming</option>
                <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                <option value={TaskStatus.COMPLETED}>Completed</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNewTaskModal(false)}>
            Cancel
          </Button>
          <Button
            className="rainbow-btn"
            onClick={handleCreateTask}
            disabled={isCreating || !newTaskName.trim()}
          >
            {isCreating ? <Spinner size="sm" animation="border" className="me-1" /> : null}
            Create Task
          </Button>
        </Modal.Footer>
      </Modal>
    </React.Fragment>
  );
};

export default ExerciseTaskList;
