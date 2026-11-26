/* D1 storage for project-brief drafts and submissions.
   token_hash is the only lookup key. Internal ids stay in the database. */

function changes(result) {
  return result && result.meta && Number(result.meta.changes) || 0;
}

function isConstraint(error) {
  const message = String(error && error.message || "");
  return /unique|constraint/i.test(message);
}

export async function createDraft(db, row) {
  await db.prepare(
    `INSERT INTO drafts (
      id, token_hash, schema_version, step, answers_json, idempotency_key,
      revision, status, created_at, updated_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 'open', ?, ?, ?)`
  ).bind(
    row.id,
    row.tokenHash,
    row.schemaVersion,
    row.step,
    row.answersJson,
    row.idempotencyKey,
    row.now,
    row.now,
    row.expiresAt
  ).run();
  return { revision: 1, expiresAt: row.expiresAt };
}

export async function getDraftByHash(db, tokenHash) {
  return db.prepare(
    `SELECT id, schema_version, step, answers_json, idempotency_key, revision,
            status, submission_id, expires_at
     FROM drafts WHERE token_hash = ?`
  ).bind(tokenHash).first();
}

export async function updateDraft(db, row) {
  const result = await db.prepare(
    `UPDATE drafts
     SET step = ?, answers_json = ?, idempotency_key = ?, revision = revision + 1,
         updated_at = ?, expires_at = ?
     WHERE token_hash = ? AND revision = ? AND status = 'open' AND expires_at > ?`
  ).bind(
    row.step,
    row.answersJson,
    row.idempotencyKey,
    row.now,
    row.expiresAt,
    row.tokenHash,
    row.revision,
    row.now
  ).run();
  if (changes(result) === 1) {
    return { ok: true, revision: row.revision + 1, expiresAt: row.expiresAt };
  }
  const current = await getDraftByHash(db, row.tokenHash);
  if (!current) return { ok: false, error: "not_found" };
  if (current.status !== "open") return { ok: false, error: "submitted" };
  if (current.expires_at <= row.now) return { ok: false, error: "expired" };
  return {
    ok: false,
    error: "conflict",
    revision: current.revision,
    step: current.step,
    answersJson: current.answers_json,
    expiresAt: current.expires_at
  };
}

export async function findSubmission(db, idempotencyKey) {
  if (!idempotencyKey) return null;
  return db.prepare(
    `SELECT id, email_status, draft_id FROM submissions WHERE idempotency_key = ?`
  ).bind(idempotencyKey).first();
}

export async function findSubmissionById(db, id) {
  if (!id) return null;
  return db.prepare(
    `SELECT id, email_status FROM submissions WHERE id = ?`
  ).bind(id).first();
}

export async function claimAndStore(db, row) {
  const existing = await findSubmission(db, row.idempotencyKey);
  if (existing) {
    if (row.tokenHash) await markSubmitted(db, row.tokenHash, existing.id, row.now);
    return { ok: true, id: existing.id, duplicate: true, emailStatus: existing.email_status };
  }

  if (row.tokenHash) {
    const claim = await db.prepare(
      `UPDATE drafts
       SET status = 'submitted', submission_id = ?, updated_at = ?
       WHERE token_hash = ? AND status = 'open'`
    ).bind(row.id, row.now, row.tokenHash).run();
    if (changes(claim) !== 1) {
      const draft = await getDraftByHash(db, row.tokenHash);
      if (!draft) return { ok: false, error: "not_found" };
      if (draft.status === "submitted") {
        const prior = await findSubmissionById(db, draft.submission_id);
        return {
          ok: true,
          id: prior ? prior.id : draft.submission_id,
          alreadySubmitted: true,
          emailStatus: prior ? prior.email_status : ""
        };
      }
      return { ok: false, error: "not_found" };
    }
  }

  try {
    await db.prepare(
      `INSERT INTO submissions (
        id, idempotency_key, draft_id, schema_version, answers_json, summary_text, email_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      row.id,
      row.idempotencyKey,
      row.draftId || null,
      row.schemaVersion,
      row.answersJson,
      row.summaryText,
      row.emailStatus,
      row.now
    ).run();
  } catch (error) {
    if (isConstraint(error)) {
      const prior = await findSubmission(db, row.idempotencyKey);
      if (prior) return { ok: true, id: prior.id, duplicate: true, emailStatus: prior.email_status };
    }
    if (row.tokenHash) {
      await db.prepare(
        `UPDATE drafts SET status = 'open', submission_id = NULL
         WHERE token_hash = ? AND submission_id = ? AND status = 'submitted'`
      ).bind(row.tokenHash, row.id).run();
    }
    throw error;
  }

  return { ok: true, id: row.id, duplicate: false };
}

async function markSubmitted(db, tokenHash, submissionId, now) {
  await db.prepare(
    `UPDATE drafts SET status = 'submitted', submission_id = ?, updated_at = ?
     WHERE token_hash = ? AND status = 'open'`
  ).bind(submissionId, now, tokenHash).run();
}

export async function setEmailStatus(db, id, emailStatus) {
  await db.prepare(`UPDATE submissions SET email_status = ? WHERE id = ?`).bind(emailStatus, id).run();
}

export function parseDraft(row) {
  let answers = {};
  try {
    answers = JSON.parse(row.answers_json);
  } catch (error) {
    answers = {};
  }
  return {
    schemaVersion: row.schema_version,
    step: row.step,
    answers: answers,
    idempotencyKey: row.idempotency_key,
    revision: row.revision,
    expiresAt: row.expires_at,
    draftId: row.id
  };
}
