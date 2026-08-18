import type { Request, Response } from "express";
import {
  createArtifactForWorkspace,
  deleteArtifactForWorkspace,
  getArtifactForWorkspace,
  listArtifactsForWorkspace,
} from "../services/artifactService.js";
import { ValidationError } from "../types/errors.js";
import { getZodFieldErrors } from "../utils/zod-error.js";
import {
  artifactIdParamSchema,
  createArtifactSchema,
} from "../validators/artifactValidator.js";
import { parseWorkspaceId } from "./workspaceController.js";

function parseArtifactParams(params: Request["params"]) {
  const parsed = artifactIdParamSchema.safeParse(params);

  if (!parsed.success) {
    throw new ValidationError(
      "Invalid artifact id",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

function parseCreateBody(body: unknown) {
  const parsed = createArtifactSchema.safeParse(body);

  if (!parsed.success) {
    throw new ValidationError(
      "Validation failed",
      getZodFieldErrors(parsed.error),
    );
  }

  return parsed.data;
}

export async function listArtifacts(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const artifacts = await listArtifactsForWorkspace(
    workspaceId,
    req.session.user.id,
  );
  res.json(artifacts);
}

export async function getArtifact(req: Request, res: Response) {
  const { workspaceId, artifactId } = parseArtifactParams(req.params);
  const artifact = await getArtifactForWorkspace(
    workspaceId,
    artifactId,
    req.session.user.id,
  );
  res.json(artifact);
}

export async function createArtifact(req: Request, res: Response) {
  const { workspaceId } = parseWorkspaceId(req.params);
  const input = parseCreateBody(req.body);
  const artifact = await createArtifactForWorkspace(
    workspaceId,
    req.session.user.id,
    input,
  );
  res.status(201).json(artifact);
}

export async function deleteArtifact(req: Request, res: Response) {
  const { workspaceId, artifactId } = parseArtifactParams(req.params);
  await deleteArtifactForWorkspace(
    workspaceId,
    artifactId,
    req.session.user.id,
  );
  res.status(204).send();
}
