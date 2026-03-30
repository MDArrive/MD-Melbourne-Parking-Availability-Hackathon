import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { List, Car, PieChart, CheckCircle, Circle } from 'lucide-react';

interface ExerciseTask {
  label: string;
  done: boolean;
}

interface Exercise {
  number: number;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  difficulty: string;
  difficultyVariant: string;
  tasks: ExerciseTask[];
}

const exercises: Exercise[] = [
  {
    number: 1,
    title: 'Task List',
    description:
      'A task management UI is connected to a backend API with read functionality already working. Your job is to implement the remaining CRUD operations using AI assistance.',
    href: '/exercises/tasks/list',
    icon: <List size={24} />,
    difficulty: 'Beginner',
    difficultyVariant: 'success',
    tasks: [
      { label: "Connect the 'New Task' button to the POST endpoint", done: false },
      { label: 'Implement task status updates (complete/incomplete) via PUT', done: false },
      { label: 'Implement task deletion via DELETE', done: false },
      { label: "Replace the 'View' button with 'Edit' functionality", done: false },
    ],
  },
  {
    number: 2,
    title: 'Car Park Availability',
    description:
      'Build a full-stack car park availability system from scratch. Design the database, create the API, and build a dashboard showing zone availability with the ability to book and release bays.',
    href: '/exercises/parking',
    icon: <Car size={24} />,
    difficulty: 'Intermediate',
    difficultyVariant: 'warning',
    tasks: [
      { label: 'Design the database schema and seed with sample data', done: false },
      { label: 'Create backend API endpoints for zones and bays', done: false },
      { label: 'Build an availability dashboard with colour-coded zones', done: false },
      { label: 'Add bay management — book and release individual bays', done: false },
      { label: 'Bonus: Visual bay map (floorplan-style layout)', done: false },
      { label: 'Bonus: Live polling updates across users', done: false },
      { label: 'Bonus: Booking details with driver name and vehicle search', done: false },
    ],
  },
  {
    number: 3,
    title: 'Analytics Chart',
    description:
      'Fetch analytics data from a backend endpoint and visualise it with a charting library. You will need to discover the API yourself using AI, then build the chart.',
    href: '/exercises/analytics-chart',
    icon: <PieChart size={24} />,
    difficulty: 'Intermediate',
    difficultyVariant: 'warning',
    tasks: [
      { label: 'Discover and fetch data from the analytics API endpoint', done: false },
      { label: 'Choose and install a charting library', done: false },
      { label: 'Render the analytics data as a chart', done: false },
    ],
  },
];

const ExerciseCard = ({ exercise }: { exercise: Exercise }) => {
  const completedCount = exercise.tasks.filter((t) => t.done).length;
  const totalCount = exercise.tasks.length;

  return (
    <Card className="mb-3">
      <Card.Body>
        <Row className="align-items-start">
          <Col xs="auto" className="pe-0">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
              style={{ width: 48, height: 48 }}
            >
              {exercise.icon}
            </div>
          </Col>
          <Col>
            <div className="d-flex align-items-center mb-1">
              <Card.Title as="h5" className="mb-0 me-2">
                Exercise {exercise.number}: {exercise.title}
              </Card.Title>
              <Badge bg="" className={`badge-subtle-${exercise.difficultyVariant}`}>
                {exercise.difficulty}
              </Badge>
              {completedCount === totalCount && totalCount > 0 && (
                <Badge bg="success" className="ms-2">
                  Complete
                </Badge>
              )}
            </div>
            <p className="text-muted mb-2">{exercise.description}</p>

            <ul className="list-unstyled mb-2">
              {exercise.tasks.map((task, i) => (
                <li key={i} className="d-flex align-items-start mb-1">
                  {task.done ? (
                    <CheckCircle size={16} className="text-success me-2 mt-1 flex-shrink-0" />
                  ) : (
                    <Circle size={16} className="text-muted me-2 mt-1 flex-shrink-0" />
                  )}
                  <span className={task.done ? 'text-muted text-decoration-line-through' : ''}>
                    {task.label}
                  </span>
                </li>
              ))}
            </ul>

            <Link to={exercise.href} className="btn btn-primary btn-sm">
              Go to Exercise
            </Link>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

const HomePage = () => {
  return (
    <React.Fragment>
      <Helmet title="Home" />
      <Container fluid className="p-0">
        <h1 className="h3 mb-3">AI-Assisted Development Bootcamp</h1>

        <Card className="mb-4">
          <Card.Body>
            <Card.Text>
              Welcome! In this bootcamp you will use an AI coding assistant to build features in a
              real full-stack application. Each exercise below has a set of tasks to complete.
              Navigate to an exercise to read the detailed instructions, then use your AI assistant
              to help you implement the solution.
            </Card.Text>
          </Card.Body>
        </Card>

        <h2 className="h4 mb-3">Exercises</h2>

        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.number} exercise={exercise} />
        ))}
      </Container>
    </React.Fragment>
  );
};

export default HomePage;
