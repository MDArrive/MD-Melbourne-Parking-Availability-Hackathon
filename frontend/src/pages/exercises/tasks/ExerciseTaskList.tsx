import React, { useState, useEffect, useCallback } from "react";
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
  Modal,
  Form,
  Dropdown,
  ButtonGroup,
} from "react-bootstrap";
import { Plus, Edit2, Trash2, Check, X, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-regular-svg-icons";

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

// Form data interface for task creation/editing
interface TaskFormData {
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
}

// Task Modal Props
interface TaskModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  task?: ExampleTask | null;
  mode: 'create' | 'edit';
}

// Task Modal Component
const TaskModal: React.FC<TaskModalProps> = ({ show, onHide, onSave, task, mode }) => {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    status: TaskStatus.UPCOMING,
    priority: TaskPriority.MEDIUM,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when modal opens or task changes
  useEffect(() => {
    if (show) {
      if (task && mode === 'edit') {
        setFormData({
          name: task.name,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          status: TaskStatus.UPCOMING,
          priority: TaskPriority.MEDIUM,
        });
      }
      setError(null);
    }
  }, [show, task, mode]);

  const handleChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      setError('Task name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(formData);
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onHide();
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={handleClose}
      backdrop={isSubmitting ? 'static' : true}
      keyboard={!isSubmitting}
      size="lg"
      centered
    >
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton={!isSubmitting}>
          <Modal.Title>
            {mode === 'create' ? 'Create New Task' : 'Edit Task'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Task Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter task name"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter task description (optional)"
              disabled={isSubmitting}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value={TaskStatus.UPCOMING}>Upcoming</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Priority</Form.Label>
                <Form.Select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Update Task'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// Delete Confirmation Modal
interface DeleteModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => Promise<void>;
  taskName: string;
}

const DeleteConfirmModal: React.FC<DeleteModalProps> = ({ show, onHide, onConfirm, taskName }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onHide();
    } catch (err) {
      // Error handling is done in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Delete</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want to delete the task <strong>"{taskName}"</strong>? This action cannot be undone.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete Task'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

interface TaskTableProps {
  tasks: ExampleTask[];
  onEdit: (task: ExampleTask) => void;
  onDelete: (task: ExampleTask) => void;
  onStatusChange: (task: ExampleTask, newStatus: TaskStatus) => void;
  droppableId: string;
}

const TaskTable = ({ tasks, onEdit, onDelete, onStatusChange, droppableId }: TaskTableProps) => {
  return (
    <Table responsive>
      <thead>
        <tr>
          <th className="align-middle" style={{ width: '30px' }}></th>
          <th className="align-middle" style={{ width: '40px' }}>
            Status
          </th>
          <th className="align-middle w-50">Name</th>
          <th className="align-middle d-none d-xl-table-cell">Description</th>
          <th className="align-middle d-none d-xxl-table-cell">Created</th>
          <th className="align-middle">Priority</th>
          <th className="align-middle text-end">Actions</th>
        </tr>
      </thead>
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <tbody
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={snapshot.isDraggingOver ? 'bg-light' : ''}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <tr
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={snapshot.isDragging ? 'shadow' : ''}
                  >
                    <td {...provided.dragHandleProps} className="text-muted cursor-grab">
                      <GripVertical size={16} />
                    </td>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={task.status === TaskStatus.COMPLETED}
                        onChange={(e) => {
                          const newStatus = e.target.checked ? TaskStatus.COMPLETED : TaskStatus.UPCOMING;
                          onStatusChange(task, newStatus);
                        }}
                        aria-label={`Mark ${task.name} as ${task.status === TaskStatus.COMPLETED ? 'incomplete' : 'complete'}`}
                      />
                    </td>
                    <td>
                      <strong className={task.status === TaskStatus.COMPLETED ? 'text-decoration-line-through text-muted' : ''}>
                        {task.name}
                      </strong>
                    </td>
                    <td className="d-none d-xl-table-cell">{task.description || '-'}</td>
                    <td className="d-none d-xxl-table-cell">{new Date(task.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Badge bg="" className={`badge-subtle-${priorityVariantMap[task.priority]}`}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <ButtonGroup size="sm">
                        <Button 
                          variant="light" 
                          onClick={() => onEdit(task)}
                          title="Edit task"
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="light" 
                          onClick={() => onDelete(task)}
                          title="Delete task"
                          className="text-danger"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {tasks.length === 0 && (
                <tr>
                    <td colSpan={7} className="text-center p-3">No tasks in this category.</td>
                </tr>
            )}
          </tbody>
        )}
      </Droppable>
    </Table>
  );
};

interface TaskBoardProps {
  title: string;
  tasks: ExampleTask[];
  onCreateTask: () => void;
  onEditTask: (task: ExampleTask) => void;
  onDeleteTask: (task: ExampleTask) => void;
  onStatusChange: (task: ExampleTask, newStatus: TaskStatus) => void;
  droppableId: string;
}

const TaskBoard = ({ title, tasks, onCreateTask, onEditTask, onDeleteTask, onStatusChange, droppableId }: TaskBoardProps) => {
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
                onClick={onCreateTask}
              >
                <Plus size={18} /> New Task
              </Button>
            </div>
          </Col>
        </Row>
        <TaskTable 
          tasks={tasks} 
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onStatusChange={onStatusChange}
          droppableId={droppableId}
        />
      </Card.Body>
    </Card>
  );
};

const ExerciseTaskList = () => {
  const [tasks, setTasks] = useState<ExampleTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showIntroAlert, setShowIntroAlert] = useState<boolean>(true);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ExampleTask | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [taskToDelete, setTaskToDelete] = useState<ExampleTask | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load tasks
  const loadTasks = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Create task handler
  const handleCreateTask = useCallback(() => {
    setSelectedTask(null);
    setModalMode('create');
    setShowTaskModal(true);
    setApiError(null);
  }, []);

  // Edit task handler
  const handleEditTask = useCallback((task: ExampleTask) => {
    setSelectedTask(task);
    setModalMode('edit');
    setShowTaskModal(true);
    setApiError(null);
  }, []);

  // Save task (create or update)
  const handleSaveTask = useCallback(async (formData: TaskFormData) => {
    try {
      if (modalMode === 'create') {
        // Create new task
        const newTask = await fetchApi<ExampleTask>('/exercises/tasks', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        
        if (newTask) {
          setTasks(prev => [...prev, newTask]);
          setShowTaskModal(false);
        }
      } else if (selectedTask) {
        // Update existing task
        const updatedTask = await fetchApi<ExampleTask>(`/exercises/tasks/${selectedTask.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        
        if (updatedTask) {
          setTasks(prev => prev.map(task => 
            task.id === selectedTask.id ? updatedTask : task
          ));
          setShowTaskModal(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save task';
      setApiError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [modalMode, selectedTask]);

  // Delete task handler
  const handleDeleteClick = useCallback((task: ExampleTask) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
    setApiError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!taskToDelete) return;

    try {
      await fetchApi(`/exercises/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });
      
      setTasks(prev => prev.filter(task => task.id !== taskToDelete.id));
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setApiError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [taskToDelete]);

  // Status change handler
  const handleStatusChange = useCallback(async (task: ExampleTask, newStatus: TaskStatus) => {
    try {
      const updatedTask = await fetchApi<ExampleTask>(`/exercises/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (updatedTask) {
        setTasks(prev => prev.map(t => 
          t.id === task.id ? updatedTask : t
        ));
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to update task status');
      // Optionally show a toast notification here
    }
  }, []);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the task that was dragged
    const draggedTask = tasks.find(task => task.id === draggableId);
    if (!draggedTask) return;

    // Determine new status based on destination
    let newStatus: TaskStatus;
    switch (destination.droppableId) {
      case 'upcoming':
        newStatus = TaskStatus.UPCOMING;
        break;
      case 'in-progress':
        newStatus = TaskStatus.IN_PROGRESS;
        break;
      case 'completed':
        newStatus = TaskStatus.COMPLETED;
        break;
      default:
        return;
    }

    // If status hasn't changed and it's just reordering, we can skip the API call
    if (draggedTask.status === newStatus) {
      // For now, we'll just handle status changes, not reordering within the same status
      return;
    }

    // Optimistically update the UI
    setTasks(prev => prev.map(task => 
      task.id === draggableId ? { ...task, status: newStatus } : task
    ));

    // Update via API
    try {
      const updatedTask = await fetchApi<ExampleTask>(`/exercises/tasks/${draggableId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (updatedTask) {
        setTasks(prev => prev.map(task => 
          task.id === draggableId ? updatedTask : task
        ));
      }
    } catch (err) {
      // Rollback on error
      setTasks(prev => prev.map(task => 
        task.id === draggableId ? draggedTask : task
      ));
      setApiError(err instanceof Error ? err.message : 'Failed to update task status');
    }
  }, [tasks]);

  const upcomingTasks = tasks.filter((task) => task.status === TaskStatus.UPCOMING);
  const inProgressTasks = tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS);
  const completedTasks = tasks.filter((task) => task.status === TaskStatus.COMPLETED);

  return (
    <React.Fragment>
      <Helmet title="Task List Exercise" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3">Task List Exercise</h1>

        {/* Introductory Blurb */}
        {showIntroAlert && (
          <Alert 
            variant="primary" 
            className="alert-outline"
            onClose={() => setShowIntroAlert(false)}
            dismissible
          >
            <div className="alert-icon">
              <FontAwesomeIcon icon={faBell} fixedWidth />
            </div>
            <div className="alert-message">
              <strong>Welcome to the Task List Exercise!</strong>
              <p className="mb-2">
                This page demonstrates a basic task list connected to a backend API. 
                The tasks you see below are fetched live from the database via 
                <code>/api/exercises/tasks</code>.
              </p>
              <p className="mb-1">
                While the read functionality is complete, there are still features 
                to implement as outlined in the project plan (
                <a href="/docs/plans/01-Task-Exercise-API.md" target="_blank" rel="noopener noreferrer"><code>docs/plans/01-Task-Exercise-API.md</code></a>).
                Your next steps are to implement the following, using AI assistance:
              </p>
              <ul>
                <li>Connect the 'New Task' button to the POST endpoint.</li>
                <li>Implement functionality to update task status (mark complete/incomplete) via the PUT endpoint.</li>
                <li>Implement functionality to delete tasks via the DELETE endpoint.</li>
                <li>Replace the 'View' button with an 'Edit' button and implement task editing functionality.</li>
              </ul>
            </div>
          </Alert>
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <TaskBoard 
              title={statusMap[TaskStatus.UPCOMING]} 
              tasks={upcomingTasks}
              onCreateTask={handleCreateTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteClick}
              onStatusChange={handleStatusChange}
              droppableId="upcoming"
            />
            <TaskBoard 
              title={statusMap[TaskStatus.IN_PROGRESS]} 
              tasks={inProgressTasks}
              onCreateTask={handleCreateTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteClick}
              onStatusChange={handleStatusChange}
              droppableId="in-progress"
            />
            <TaskBoard 
              title={statusMap[TaskStatus.COMPLETED]} 
              tasks={completedTasks}
              onCreateTask={handleCreateTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteClick}
              onStatusChange={handleStatusChange}
              droppableId="completed"
            />
          </DragDropContext>
        )}

        {/* Task Modal */}
        <TaskModal
          show={showTaskModal}
          onHide={() => {
            setShowTaskModal(false);
            setApiError(null);
          }}
          onSave={handleSaveTask}
          task={selectedTask}
          mode={modalMode}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          show={showDeleteModal}
          onHide={() => {
            setShowDeleteModal(false);
            setApiError(null);
          }}
          onConfirm={handleConfirmDelete}
          taskName={taskToDelete?.name || ''}
        />

        {/* API Error Alert */}
        {apiError && (
          <Alert 
            variant="danger" 
            dismissible 
            onClose={() => setApiError(null)}
            style={{ position: 'fixed', bottom: 20, right: 20, minWidth: 300 }}
          >
            <strong>Error:</strong> {apiError}
          </Alert>
        )}
      </Container>
    </React.Fragment>
  );
};

export default ExerciseTaskList; 