import {
  BaseEdge,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export const CURRICULUM_COLUMN_STEP = 206;

export type PrerequisiteEdge = Edge<
  { laneOffset: number; laneSide: -1 | 1 },
  "prerequisite"
>;

type Point = { x: number; y: number };

function roundedPath(points: Point[], cornerRadius: number) {
  const path = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incomingLength = Math.hypot(current.x - previous.x, current.y - previous.y);
    const outgoingLength = Math.hypot(next.x - current.x, next.y - current.y);
    const radius = Math.min(cornerRadius, incomingLength / 2, outgoingLength / 2);

    if (radius < 0.5) {
      path.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const beforeX = current.x - ((current.x - previous.x) / incomingLength) * radius;
    const beforeY = current.y - ((current.y - previous.y) / incomingLength) * radius;
    const afterX = current.x + ((next.x - current.x) / outgoingLength) * radius;
    const afterY = current.y + ((next.y - current.y) / outgoingLength) * radius;
    path.push(`L ${beforeX} ${beforeY} Q ${current.x} ${current.y} ${afterX} ${afterY}`);
  }

  const last = points[points.length - 1];
  path.push(`L ${last.x} ${last.y}`);
  return path.join(" ");
}

export function RoundedPrerequisiteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  markerEnd,
}: EdgeProps<PrerequisiteEdge>) {
  const verticalDistance = targetY - sourceY;
  let path: string;

  if (verticalDistance <= 0) {
    const laneSide = sourceX <= targetX ? 1 : -1;
    const laneX = sourceX + laneSide * (CURRICULUM_COLUMN_STEP / 2 + (data?.laneOffset ?? 0));
    path = roundedPath([
      { x: sourceX, y: sourceY },
      { x: sourceX, y: sourceY + 20 },
      { x: laneX, y: sourceY + 20 },
      { x: laneX, y: targetY - 20 },
      { x: targetX, y: targetY - 20 },
      { x: targetX, y: targetY },
    ], 9);
  } else if (Math.abs(sourceX - targetX) < 1 && verticalDistance < 120) {
    path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  } else if (verticalDistance < 120) {
    const middleY = (sourceY + targetY) / 2 + (data?.laneOffset ?? 0);
    path = roundedPath([
      { x: sourceX, y: sourceY },
      { x: sourceX, y: middleY },
      { x: targetX, y: middleY },
      { x: targetX, y: targetY },
    ], 8);
  } else {
    const laneSide = sourceX === targetX
      ? (data?.laneSide ?? 1)
      : sourceX < targetX ? -1 : 1;
    const laneX = targetX + laneSide * (CURRICULUM_COLUMN_STEP / 2 + (data?.laneOffset ?? 0));
    path = roundedPath([
      { x: sourceX, y: sourceY },
      { x: sourceX, y: sourceY + 20 },
      { x: laneX, y: sourceY + 20 },
      { x: laneX, y: targetY - 20 },
      { x: targetX, y: targetY - 20 },
      { x: targetX, y: targetY },
    ], 9);
  }

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={14} />;
}
