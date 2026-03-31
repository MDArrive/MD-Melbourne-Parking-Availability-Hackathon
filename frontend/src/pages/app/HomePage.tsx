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

        <Card className="mb-4 border-primary">
          <Card.Body>
            <h5 className="mb-2">Welcome to the AI-Assisted Development Bootcamp</h5>
            <p className="mb-3">
              In this session you will use an AI coding assistant to build real features in a
              real application. <strong>You do not need to understand the code or the
              technology</strong> — you'll describe what you want in plain English and the AI
              will do the implementation for you.
            </p>

            <div className="rounded p-3 mb-3" style={{ background: '#d1e7dd' }}>
              <strong>How it works:</strong>
              <ol className="mb-0 mt-1">
                <li>Click on an exercise below to see its tasks.</li>
                <li>Read the task description, then tell Claude what you want in your own words.</li>
                <li>Let Claude make the changes. Review what it did, then move to the next task.</li>
                <li>If you get stuck, each task has an example prompt you can reveal and copy.</li>
                <li>If something goes wrong, just tell Claude what happened and it will fix it.</li>
              </ol>
            </div>

            <div className="rounded p-3 mb-0" style={{ background: '#cfe2ff' }}>
              <strong>What you'll learn:</strong> You can build, extend, and explore software
              without understanding the codebase or the technology that powers it. Across the
              exercises you'll see that AI can modify existing code, build entire features from
              scratch, explore an unfamiliar codebase, choose and integrate tools, and combine
              systems together — all from plain English descriptions of what you want.
            </div>
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
