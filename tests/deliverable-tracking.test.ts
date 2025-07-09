import { describe, it, expect, beforeEach } from "vitest"

describe("Deliverable Tracking Contract", () => {
  const deliverables = new Map()
  let nextDeliverableId = 1
  let currentSender = "SP000000000000000000002Q6VF78"
  let blockHeight = 1000
  
  const ERR_UNAUTHORIZED = 500
  const ERR_DELIVERABLE_NOT_FOUND = 501
  const ERR_INVALID_STATUS = 502
  const ERR_ALREADY_SUBMITTED = 503
  const ERR_NOT_SUBMITTED = 504
  
  const DELIVERABLE_PENDING = 0
  const DELIVERABLE_SUBMITTED = 1
  const DELIVERABLE_APPROVED = 2
  const DELIVERABLE_REJECTED = 3
  const DELIVERABLE_REVISION_REQUIRED = 4
  
  beforeEach(() => {
    deliverables.clear()
    nextDeliverableId = 1
    currentSender = "SP000000000000000000002Q6VF78"
    blockHeight = 1000
  })
  
  const createDeliverable = (projectId, title, description, assignedTo, reviewer, dueDate) => {
    const deliverableId = nextDeliverableId
    
    deliverables.set(deliverableId, {
      projectId,
      title,
      description,
      assignedTo,
      reviewer,
      dueDate,
      status: DELIVERABLE_PENDING,
      createdAt: blockHeight,
      submittedAt: null,
      reviewedAt: null,
      submissionHash: null,
      reviewNotes: null,
    })
    
    nextDeliverableId += 1
    return { success: deliverableId }
  }
  
  const submitDeliverable = (deliverableId, submissionHash) => {
    const deliverable = deliverables.get(deliverableId)
    if (!deliverable) {
      return { error: ERR_DELIVERABLE_NOT_FOUND }
    }
    
    if (currentSender !== deliverable.assignedTo) {
      return { error: ERR_UNAUTHORIZED }
    }
    
    if (deliverable.status !== DELIVERABLE_PENDING) {
      return { error: ERR_ALREADY_SUBMITTED }
    }
    
    deliverables.set(deliverableId, {
      ...deliverable,
      status: DELIVERABLE_SUBMITTED,
      submittedAt: blockHeight,
      submissionHash,
    })
    
    return { success: true }
  }
  
  const reviewDeliverable = (deliverableId, newStatus, reviewNotes) => {
    const deliverable = deliverables.get(deliverableId)
    if (!deliverable) {
      return { error: ERR_DELIVERABLE_NOT_FOUND }
    }
    
    if (currentSender !== deliverable.reviewer) {
      return { error: ERR_UNAUTHORIZED }
    }
    
    if (deliverable.status !== DELIVERABLE_SUBMITTED) {
      return { error: ERR_NOT_SUBMITTED }
    }
    
    if (![DELIVERABLE_APPROVED, DELIVERABLE_REJECTED, DELIVERABLE_REVISION_REQUIRED].includes(newStatus)) {
      return { error: ERR_INVALID_STATUS }
    }
    
    deliverables.set(deliverableId, {
      ...deliverable,
      status: newStatus,
      reviewedAt: blockHeight,
      reviewNotes,
    })
    
    return { success: true }
  }
  
  const resubmitDeliverable = (deliverableId, submissionHash) => {
    const deliverable = deliverables.get(deliverableId)
    if (!deliverable) {
      return { error: ERR_DELIVERABLE_NOT_FOUND }
    }
    
    if (currentSender !== deliverable.assignedTo) {
      return { error: ERR_UNAUTHORIZED }
    }
    
    if (deliverable.status !== DELIVERABLE_REVISION_REQUIRED) {
      return { error: ERR_INVALID_STATUS }
    }
    
    deliverables.set(deliverableId, {
      ...deliverable,
      status: DELIVERABLE_SUBMITTED,
      submittedAt: blockHeight,
      submissionHash,
      reviewNotes: null,
    })
    
    return { success: true }
  }
  
  const getDeliverable = (deliverableId) => {
    return deliverables.get(deliverableId) || null
  }
  
  const getDeliverableStatus = (deliverableId) => {
    const deliverable = deliverables.get(deliverableId)
    return deliverable ? deliverable.status : null
  }
  
  const isDeliverableOverdue = (deliverableId) => {
    const deliverable = deliverables.get(deliverableId)
    if (!deliverable) return null
    
    return deliverable.dueDate < blockHeight && deliverable.status !== DELIVERABLE_APPROVED
  }
  
  const getSubmissionHash = (deliverableId) => {
    const deliverable = deliverables.get(deliverableId)
    return deliverable ? deliverable.submissionHash : null
  }
  
  describe("Deliverable Creation", () => {
    it("should create deliverable successfully", () => {
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      const result = createDeliverable(1, "API Documentation", "Complete API documentation", assignee, reviewer, 2000)
      
      expect(result.success).toBe(1)
      
      const deliverable = getDeliverable(1)
      expect(deliverable.projectId).toBe(1)
      expect(deliverable.title).toBe("API Documentation")
      expect(deliverable.description).toBe("Complete API documentation")
      expect(deliverable.assignedTo).toBe(assignee)
      expect(deliverable.reviewer).toBe(reviewer)
      expect(deliverable.dueDate).toBe(2000)
      expect(deliverable.status).toBe(DELIVERABLE_PENDING)
      expect(deliverable.createdAt).toBe(blockHeight)
      expect(deliverable.submittedAt).toBe(null)
      expect(deliverable.reviewedAt).toBe(null)
      expect(deliverable.submissionHash).toBe(null)
      expect(deliverable.reviewNotes).toBe(null)
    })
    
    it("should increment deliverable ID for multiple deliverables", () => {
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      
      const result1 = createDeliverable(1, "Deliverable 1", "Description 1", assignee, reviewer, 2000)
      const result2 = createDeliverable(1, "Deliverable 2", "Description 2", assignee, reviewer, 2100)
      
      expect(result1.success).toBe(1)
      expect(result2.success).toBe(2)
    })
  })
  
  describe("Deliverable Submission", () => {
    beforeEach(() => {
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      createDeliverable(1, "Test Deliverable", "Description", assignee, reviewer, 2000)
    })
    
    it("should submit deliverable successfully", () => {
      currentSender = "SP1234567890123456789012345678901234567890"
      const hash = new Uint8Array(32).fill(1) // Mock hash
      const result = submitDeliverable(1, hash)
      
      expect(result.success).toBe(true)
      
      const deliverable = getDeliverable(1)
      expect(deliverable.status).toBe(DELIVERABLE_SUBMITTED)
      expect(deliverable.submittedAt).toBe(blockHeight)
      expect(deliverable.submissionHash).toEqual(hash)
    })
    
    it("should fail if not assignee", () => {
      currentSender = "SP9999999999999999999999999999999999999999"
      const hash = new Uint8Array(32).fill(1)
      const result = submitDeliverable(1, hash)
      
      expect(result.error).toBe(ERR_UNAUTHORIZED)
    })
    
    it("should fail for non-existent deliverable", () => {
      const hash = new Uint8Array(32).fill(1)
      const result = submitDeliverable(999, hash)
      
      expect(result.error).toBe(ERR_DELIVERABLE_NOT_FOUND)
    })
    
    it("should fail if already submitted", () => {
      currentSender = "SP1234567890123456789012345678901234567890"
      const hash = new Uint8Array(32).fill(1)
      
      submitDeliverable(1, hash) // First submission
      const result = submitDeliverable(1, hash) // Second submission
      
      expect(result.error).toBe(ERR_ALREADY_SUBMITTED)
    })
  })
  
  describe("Deliverable Review", () => {
    beforeEach(() => {
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      createDeliverable(1, "Test Deliverable", "Description", assignee, reviewer, 2000)
      
      currentSender = assignee
      const hash = new Uint8Array(32).fill(1)
      submitDeliverable(1, hash)
    })
    
    it("should approve deliverable successfully", () => {
      currentSender = "SP5555555555555555555555555555555555555555"
      const result = reviewDeliverable(1, DELIVERABLE_APPROVED, "Looks good!")
      
      expect(result.success).toBe(true)
      
      const deliverable = getDeliverable(1)
      expect(deliverable.status).toBe(DELIVERABLE_APPROVED)
      expect(deliverable.reviewedAt).toBe(blockHeight)
      expect(deliverable.reviewNotes).toBe("Looks good!")
    })
    
    it("should reject deliverable successfully", () => {
      currentSender = "SP5555555555555555555555555555555555555555"
      const result = reviewDeliverable(1, DELIVERABLE_REJECTED, "Needs improvement")
      
      expect(result.success).toBe(true)
      
      const deliverable = getDeliverable(1)
      expect(deliverable.status).toBe(DELIVERABLE_REJECTED)
      expect(deliverable.reviewNotes).toBe("Needs improvement")
    })
    
    it("should request revision successfully", () => {
      currentSender = "SP5555555555555555555555555555555555555555"
      const result = reviewDeliverable(1, DELIVERABLE_REVISION_REQUIRED, "Please fix issues")
      
      expect(result.success).toBe(true)
      
      const deliverable = getDeliverable(1)
      expect(deliverable.status).toBe(DELIVERABLE_REVISION_REQUIRED)
      expect(deliverable.reviewNotes).toBe("Please fix issues")
    })
    
    it("should fail if not reviewer", () => {
      currentSender = "SP9999999999999999999999999999999999999999"
      const result = reviewDeliverable(1, DELIVERABLE_APPROVED, "Good")
      
      expect(result.error).toBe(ERR_UNAUTHORIZED)
    })
    
    it("should fail if not submitted", () => {
      // Create new deliverable that hasn't been submitted
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      createDeliverable(2, "New Deliverable", "Description", assignee, reviewer, 2000)
      
      currentSender = reviewer
      const result = reviewDeliverable(2, DELIVERABLE_APPROVED, "Good")
      
      expect(result.error).toBe(ERR_NOT_SUBMITTED)
    })
    
    it("should fail with invalid status", () => {
      currentSender = "SP5555555555555555555555555555555555555555"
      const result = reviewDeliverable(1, 999, "Invalid status")
      
      expect(result.error).toBe(ERR_INVALID_STATUS)
    })
  })
  
  describe("Deliverable Resubmission", () => {
    beforeEach(() => {
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      createDeliverable(1, "Test Deliverable", "Description", assignee, reviewer, 2000)
      
      // Submit and request revision
      currentSender = assignee
      const hash = new Uint8Array(32).fill(1)
      submitDeliverable(1, hash)
      
      currentSender = reviewer
      reviewDeliverable(1, DELIVERABLE_REVISION_REQUIRED, "Needs changes")
    })
    
    it("should resubmit deliverable successfully", () => {
      currentSender = "SP1234567890123456789012345678901234567890"
      const newHash = new Uint8Array(32).fill(2)
      blockHeight = 1500
      
      const result = resubmitDeliverable(1, newHash)
      
      expect(result.success).toBe(true)
      
      const deliverable = getDeliverable(1)
      expect(deliverable.status).toBe(DELIVERABLE_SUBMITTED)
      expect(deliverable.submittedAt).toBe(1500)
      expect(deliverable.submissionHash).toEqual(newHash)
      expect(deliverable.reviewNotes).toBe(null)
    })
    
    it("should fail if not assignee", () => {
      currentSender = "SP9999999999999999999999999999999999999999"
      const newHash = new Uint8Array(32).fill(2)
      const result = resubmitDeliverable(1, newHash)
      
      expect(result.error).toBe(ERR_UNAUTHORIZED)
    })
    
    it("should fail if not in revision required status", () => {
      // Create and approve a deliverable
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      createDeliverable(2, "Approved Deliverable", "Description", assignee, reviewer, 2000)
      
      currentSender = assignee
      const hash = new Uint8Array(32).fill(1)
      submitDeliverable(2, hash)
      
      currentSender = reviewer
      reviewDeliverable(2, DELIVERABLE_APPROVED, "Good")
      
      // Try to resubmit approved deliverable
      currentSender = assignee
      const newHash = new Uint8Array(32).fill(2)
      const result = resubmitDeliverable(2, newHash)
      
      expect(result.error).toBe(ERR_INVALID_STATUS)
    })
  })
  
  describe("Read-only Functions", () => {
    beforeEach(() => {
      const assignee = "SP1234567890123456789012345678901234567890"
      const reviewer = "SP5555555555555555555555555555555555555555"
      createDeliverable(1, "Test Deliverable", "Description", assignee, reviewer, 1500)
      
      currentSender = assignee
      const hash = new Uint8Array(32).fill(1)
      submitDeliverable(1, hash)
    })
    
    it("should return deliverable details correctly", () => {
      const deliverable = getDeliverable(1)
      expect(deliverable).toBeTruthy()
      expect(deliverable.title).toBe("Test Deliverable")
      expect(deliverable.status).toBe(DELIVERABLE_SUBMITTED)
    })
    
    it("should return deliverable status correctly", () => {
      expect(getDeliverableStatus(1)).toBe(DELIVERABLE_SUBMITTED)
    })
    
    it("should return submission hash correctly", () => {
      const hash = getSubmissionHash(1)
      expect(hash).toEqual(new Uint8Array(32).fill(1))
    })
    
    it("should return null for non-existent deliverable", () => {
      expect(getDeliverable(999)).toBe(null)
      expect(getDeliverableStatus(999)).toBe(null)
      expect(getSubmissionHash(999)).toBe(null)
    })
    
    it("should correctly identify overdue deliverables", () => {
      blockHeight = 1600 // Past due date
      expect(isDeliverableOverdue(1)).toBe(true)
      
      // Approve the deliverable
      currentSender = "SP5555555555555555555555555555555555555555"
      reviewDeliverable(1, DELIVERABLE_APPROVED, "Good")
      expect(isDeliverableOverdue(1)).toBe(false)
    })
    
    it("should return null for non-existent deliverable overdue check", () => {
      expect(isDeliverableOverdue(999)).toBe(null)
    })
  })
})
