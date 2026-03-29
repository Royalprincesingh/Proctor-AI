import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examAPI, questionAPI, scheduleAPI, adminAPI } from '../services/api';

const CreateExam = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [createdExam, setCreatedExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Exam Details
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    duration: '',
    totalQuestions: '',
    scheduleDate: ''
  });

  // Step 2: Add Questions
  const [currentQuestion, setCurrentQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  useEffect(() => {
    // Load users for step 3 (exclude admins from candidate list)
    if (currentStep === 3) {
      adminAPI.getUsers().then(response => {
        if (response.success) {
          // Filter out admin users - they shouldn't be candidates
          const candidateUsers = response.data.filter(user => user.role !== 'admin');
          setUsers(candidateUsers);
        }
      });
    }
  }, [currentStep]);

  const handleExamFormChange = (e) => {
    setExamForm({
      ...examForm,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();

    if (!examForm.title || !examForm.duration || !examForm.totalQuestions || !examForm.scheduleDate) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Creating exam with data:', {
        title: examForm.title,
        description: examForm.description,
        duration: parseInt(examForm.duration),
        totalQuestions: parseInt(examForm.totalQuestions),
        scheduleDate: examForm.scheduleDate
      });

      const response = await examAPI.createExam({
        title: examForm.title,
        description: examForm.description,
        duration: parseInt(examForm.duration),
        totalQuestions: parseInt(examForm.totalQuestions),
        scheduleDate: examForm.scheduleDate
      });

      console.log('📡 API Response:', response);

      if (response.success) {
        setCreatedExam(response.data);
        setCurrentStep(2);
        alert('Exam created successfully!');
      } else {
        console.error('❌ Exam creation failed:', response);
        alert('Failed to create exam: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('💥 Exam creation error:', error);
      alert('Failed to create exam. Please try again. Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (field, value) => {
    if (field === 'options') {
      const newOptions = [...currentQuestion.options];
      newOptions[value.index] = value.text;
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions
      });
    } else {
      setCurrentQuestion({
        ...currentQuestion,
        [field]: value
      });
    }
  };

  const handleAddQuestion = async () => {
    console.log('handleAddQuestion called');
    console.log('createdExam:', createdExam);
    console.log('currentQuestion:', currentQuestion);

    if (!currentQuestion.questionText || !currentQuestion.correctAnswer) {
      alert('Please fill question text and select correct answer');
      return;
    }

    if (currentQuestion.options.some(opt => opt.trim() === '')) {
      alert('Please fill all option fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending question data:', {
        examId: createdExam._id,
        questionText: currentQuestion.questionText,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer
      });

      const response = await questionAPI.addQuestion({
        examId: createdExam._id,
        questionText: currentQuestion.questionText,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer
      });

      console.log('Question API response:', response);

      if (response.success) {
        console.log('Question added successfully:', response.data);
        setQuestions([...questions, response.data]);
        // Reset form
        setCurrentQuestion({
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: ''
        });
        alert('Question added successfully!');
      } else {
        console.error('Failed to add question:', response.message);
        alert('Failed to add question: ' + response.message);
      }
    } catch (error) {
      console.error('Question addition error:', error);
      alert('Failed to add question. Please try again. Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssignCandidates = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one candidate');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Calculate start and end times based on exam schedule
      const examStartTime = new Date(createdExam.scheduleDate);
      const examEndTime = new Date(examStartTime.getTime() + (createdExam.duration * 60 * 1000));

      // Assign exam to each selected user individually
      for (const userId of selectedUsers) {
        try {
          const response = await scheduleAPI.assignExam({
            examId: createdExam._id,
            userId: userId,
            startTime: examStartTime.toISOString(),
            endTime: examEndTime.toISOString()
          });

          if (response.success) {
            successCount++;
          } else {
            console.error(`Failed to assign to user ${userId}:`, response.message);
            errorCount++;
          }
        } catch (err) {
          console.error(`Error assigning to user ${userId}:`, err);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        alert(`Successfully assigned exam to ${successCount} candidate${successCount !== 1 ? 's' : ''}!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        navigate('/admin'); // Go back to admin dashboard
      } else {
        alert('Failed to assign exam to any candidates. Please try again.');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      alert(`Failed to assign candidates. Check console for details. Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="d-flex justify-content-center mb-4">
      {[1, 2, 3].map(step => (
        <div key={step} className="d-flex align-items-center">
          <div className={`rounded-circle d-flex align-items-center justify-content-center ${
            step <= currentStep ? 'bg-primary text-white' : 'bg-light text-muted'
          }`} style={{width: '40px', height: '40px'}}>
            {step}
          </div>
          {step < 3 && (
            <div className={`mx-3 ${step < currentStep ? 'bg-primary' : 'bg-light'}`} style={{width: '60px', height: '2px'}}></div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-light bg-white shadow-sm">
        <div className="container-fluid">
          <Link to="/admin" className="navbar-brand fw-bold text-primary fs-4">
            ProctorAI
          </Link>
          <div className="d-flex align-items-center">
            <span className="badge bg-primary fs-6 px-3 py-2">
              Create New Exam
            </span>
          </div>
        </div>
      </nav>

      <div className="container py-5">
        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step 1: Exam Details */}
        {currentStep === 1 && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="card shadow">
                <div className="card-header bg-primary text-white">
                  <h4 className="card-title mb-0">
                    <i className="bi bi-plus-circle me-2"></i>
                    Step 1: Exam Details
                  </h4>
                </div>
                <div className="card-body">
                  <form onSubmit={handleCreateExam}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Exam Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="title"
                        value={examForm.title}
                        onChange={handleExamFormChange}
                        placeholder="e.g., Computer Science Midterm Exam"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea
                        className="form-control"
                        name="description"
                        value={examForm.description}
                        onChange={handleExamFormChange}
                        rows="3"
                        placeholder="Brief description of the exam..."
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Duration (minutes) *</label>
                        <input
                          type="number"
                          className="form-control"
                          name="duration"
                          value={examForm.duration}
                          onChange={handleExamFormChange}
                          placeholder="e.g., 120"
                          min="1"
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label fw-semibold">Total Questions *</label>
                        <input
                          type="number"
                          className="form-control"
                          name="totalQuestions"
                          value={examForm.totalQuestions}
                          onChange={handleExamFormChange}
                          placeholder="e.g., 50"
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        name="scheduleDate"
                        value={examForm.scheduleDate}
                        onChange={handleExamFormChange}
                        required
                      />
                    </div>

                    <div className="d-flex justify-content-between">
                      <Link to="/admin" className="btn btn-secondary">
                        <i className="bi bi-arrow-left me-2"></i>
                        Back to Dashboard
                      </Link>
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Creating Exam...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Create Exam & Continue
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Add Questions */}
        {currentStep === 2 && createdExam && (
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="card shadow">
                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                  <h4 className="card-title mb-0">
                    <i className="bi bi-question-circle me-2"></i>
                    Step 2: Add Questions
                  </h4>
                  <span className="badge bg-light text-dark">
                    {questions.length} / {createdExam.totalQuestions} Questions Added
                  </span>
                </div>
                <div className="card-body">
                  {/* Current Question Form */}
                  <div className="card mb-4">
                    <div className="card-header">
                      <h6 className="mb-0">Add New Question</h6>
                    </div>
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label">Question Text</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={currentQuestion.questionText}
                          onChange={(e) => handleQuestionChange('questionText', e.target.value)}
                          placeholder="Enter your question here..."
                        />
                      </div>

                      <div className="row">
                        {['A', 'B', 'C', 'D'].map((option, index) => (
                          <div key={`option-${index}`} className="col-md-6 mb-3">
                            <label className="form-label">Option {option}</label>
                            <input
                              type="text"
                              className="form-control"
                              value={currentQuestion.options[index]}
                              onChange={(e) => handleQuestionChange('options', { index, text: e.target.value })}
                              placeholder={`Option ${option}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Correct Answer</label>
                        <select
                          className="form-select"
                          value={currentQuestion.correctAnswer}
                          onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                        >
                          <option value="">Select correct answer</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>

                      <button
                        className="btn btn-success"
                        onClick={handleAddQuestion}
                        disabled={loading || !currentQuestion.questionText || !currentQuestion.correctAnswer}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Add Question
                      </button>
                    </div>
                  </div>

                  {/* Questions List */}
                  {questions.length > 0 && (
                    <div className="card">
                      <div className="card-header">
                        <h6 className="mb-0">Added Questions</h6>
                      </div>
                      <div className="card-body">
                        <div className="list-group">
                          {questions.map((q, index) => (
                            <div key={q._id} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <h6 className="mb-2">Question {index + 1}</h6>
                                  <p className="mb-2">{q.questionText}</p>
                                  <div className="row">
                                    {q.options.map((option, optIndex) => (
                                      <div key={optIndex} className="col-md-6 mb-1">
                                        <small className={option === q.correctAnswer ? 'text-success fw-bold' : ''}>
                                          {String.fromCharCode(65 + optIndex)}) {option}
                                          {option === q.correctAnswer && ' ✓'}
                                        </small>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mt-4">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCurrentStep(1)}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Back
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => setCurrentStep(3)}
                    >
                      Continue to Assign Candidates
                      <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Assign Candidates */}
        {currentStep === 3 && createdExam && (
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="card shadow">
                <div className="card-header bg-warning text-dark">
                  <h4 className="card-title mb-0">
                    <i className="bi bi-person-plus me-2"></i>
                    Step 3: Assign Candidates
                  </h4>
                </div>
                <div className="card-body">
                  {/* Exam Summary */}
                  <div className="alert alert-info mb-4">
                    <h6 className="alert-heading mb-2">
                      <i className="bi bi-info-circle me-2"></i>
                      Exam Summary
                    </h6>
                    <p className="mb-1"><strong>Title:</strong> {createdExam.title}</p>
                    <p className="mb-1"><strong>Questions:</strong> {questions.length} / {createdExam.totalQuestions}</p>
                    <p className="mb-1"><strong>Duration:</strong> {createdExam.duration} minutes</p>
                    <p className="mb-0"><strong>Scheduled:</strong> {new Date(createdExam.scheduleDate).toLocaleString()}</p>
                  </div>

                  {/* User Selection */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">
                      Select Candidates ({selectedUsers.length} selected)
                    </h6>
                    <div className="border rounded p-3" style={{maxHeight: '400px', overflowY: 'auto'}}>
                      {Array.isArray(users) && users.length > 0 ? (
                        users.map(user => (
                          <div key={user._id || user.id} className="form-check mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`user-${user._id || user.id}`}
                              checked={selectedUsers.includes(user._id || user.id)}
                              onChange={() => handleUserSelection(user._id || user.id)}
                            />
                            <label className="form-check-label w-100" htmlFor={`user-${user._id || user.id}`}>
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <strong>{user.name}</strong>
                                  <br />
                                  <small className="text-muted">{user.email}</small>
                                </div>
                                <span className={`badge ${user.role === 'Admin' ? 'bg-primary' : 'bg-info'}`}>
                                  {user.role}
                                </span>
                              </div>
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted py-4">
                          <i className="bi bi-people fs-2 mb-2"></i>
                          <p>Loading users...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-between">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setCurrentStep(2)}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Back to Questions
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={handleAssignCandidates}
                      disabled={loading || selectedUsers.length === 0}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-person-check me-2"></i>
                          Assign {selectedUsers.length} Candidate{selectedUsers.length !== 1 ? 's' : ''} & Complete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateExam;
