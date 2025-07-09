;; Deliverable Tracking Contract
;; Tracks project deliverables and submissions

(define-constant ERR_UNAUTHORIZED (err u500))
(define-constant ERR_DELIVERABLE_NOT_FOUND (err u501))
(define-constant ERR_INVALID_STATUS (err u502))
(define-constant ERR_ALREADY_SUBMITTED (err u503))
(define-constant ERR_NOT_SUBMITTED (err u504))

;; Deliverable statuses
(define-constant DELIVERABLE_PENDING u0)
(define-constant DELIVERABLE_SUBMITTED u1)
(define-constant DELIVERABLE_APPROVED u2)
(define-constant DELIVERABLE_REJECTED u3)
(define-constant DELIVERABLE_REVISION_REQUIRED u4)

;; Data structures
(define-map deliverables uint {
    project-id: uint,
    title: (string-ascii 100),
    description: (string-ascii 500),
    assigned-to: principal,
    reviewer: principal,
    due-date: uint,
    status: uint,
    created-at: uint,
    submitted-at: (optional uint),
    reviewed-at: (optional uint),
    submission-hash: (optional (buff 32)),
    review-notes: (optional (string-ascii 300))
})

(define-data-var next-deliverable-id uint u1)

;; Deliverable management functions
(define-public (create-deliverable
    (project-id uint)
    (title (string-ascii 100))
    (description (string-ascii 500))
    (assigned-to principal)
    (reviewer principal)
    (due-date uint)
)
    (let ((deliverable-id (var-get next-deliverable-id)))
        (map-set deliverables deliverable-id {
            project-id: project-id,
            title: title,
            description: description,
            assigned-to: assigned-to,
            reviewer: reviewer,
            due-date: due-date,
            status: DELIVERABLE_PENDING,
            created-at: block-height,
            submitted-at: none,
            reviewed-at: none,
            submission-hash: none,
            review-notes: none
        })
        (var-set next-deliverable-id (+ deliverable-id u1))
        (ok deliverable-id)
    )
)

(define-public (submit-deliverable (deliverable-id uint) (submission-hash (buff 32)))
    (let ((deliverable (unwrap! (map-get? deliverables deliverable-id) ERR_DELIVERABLE_NOT_FOUND)))
        (asserts! (is-eq tx-sender (get assigned-to deliverable)) ERR_UNAUTHORIZED)
        (asserts! (is-eq (get status deliverable) DELIVERABLE_PENDING) ERR_ALREADY_SUBMITTED)

        (map-set deliverables deliverable-id
            (merge deliverable {
                status: DELIVERABLE_SUBMITTED,
                submitted-at: (some block-height),
                submission-hash: (some submission-hash)
            }))
        (ok true)
    )
)

(define-public (review-deliverable
    (deliverable-id uint)
    (new-status uint)
    (review-notes (string-ascii 300))
)
    (let ((deliverable (unwrap! (map-get? deliverables deliverable-id) ERR_DELIVERABLE_NOT_FOUND)))
        (asserts! (is-eq tx-sender (get reviewer deliverable)) ERR_UNAUTHORIZED)
        (asserts! (is-eq (get status deliverable) DELIVERABLE_SUBMITTED) ERR_NOT_SUBMITTED)
        (asserts! (or (is-eq new-status DELIVERABLE_APPROVED)
                     (is-eq new-status DELIVERABLE_REJECTED)
                     (is-eq new-status DELIVERABLE_REVISION_REQUIRED)) ERR_INVALID_STATUS)

        (map-set deliverables deliverable-id
            (merge deliverable {
                status: new-status,
                reviewed-at: (some block-height),
                review-notes: (some review-notes)
            }))
        (ok true)
    )
)

(define-public (resubmit-deliverable (deliverable-id uint) (submission-hash (buff 32)))
    (let ((deliverable (unwrap! (map-get? deliverables deliverable-id) ERR_DELIVERABLE_NOT_FOUND)))
        (asserts! (is-eq tx-sender (get assigned-to deliverable)) ERR_UNAUTHORIZED)
        (asserts! (is-eq (get status deliverable) DELIVERABLE_REVISION_REQUIRED) ERR_INVALID_STATUS)

        (map-set deliverables deliverable-id
            (merge deliverable {
                status: DELIVERABLE_SUBMITTED,
                submitted-at: (some block-height),
                submission-hash: (some submission-hash),
                review-notes: none
            }))
        (ok true)
    )
)

;; Read-only functions
(define-read-only (get-deliverable (deliverable-id uint))
    (map-get? deliverables deliverable-id)
)

(define-read-only (get-deliverable-status (deliverable-id uint))
    (match (map-get? deliverables deliverable-id)
        deliverable (some (get status deliverable))
        none
    )
)

(define-read-only (is-deliverable-overdue (deliverable-id uint))
    (match (map-get? deliverables deliverable-id)
        deliverable (some (and (< (get due-date deliverable) block-height)
                              (not (is-eq (get status deliverable) DELIVERABLE_APPROVED))))
        none
    )
)

(define-read-only (get-submission-hash (deliverable-id uint))
    (match (map-get? deliverables deliverable-id)
        deliverable (get submission-hash deliverable)
        none
    )
)
