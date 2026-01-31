import { qdrant } from "./qdrant.js";
import { randomUUID } from "crypto";
const COLLECTION = "face_embeddings";
export async function saveToQdrant(userId, embedding, meta) {
    const pointId = randomUUID();
    await qdrant.upsert(COLLECTION, {
        points: [
            {
                id: pointId,
                vector: embedding,
                payload: {
                    userId,
                    name: meta.name,
                    email: meta.email,
                    rollNumber: meta.rollNumber
                }
            }
        ]
    });
    return pointId;
}
const COLLECTION_NAME = "face_embeddings";
export async function getVectorByPointId(pointId) {
    const result = await qdrant.retrieve(COLLECTION_NAME, {
        ids: [pointId],
        with_vector: true,
        with_payload: false,
    });
    if (!result || result.length === 0 || !result[0].vector) {
        throw new Error(`Vector not found for pointId ${pointId}`);
    }
    const rawVector = result[0].vector;
    /**
     * Case 1: vector is number[]
     */
    if (Array.isArray(rawVector) && typeof rawVector[0] === "number") {
        return rawVector;
    }
    /**
     * Case 2: vector is number[][]
     */
    if (Array.isArray(rawVector) &&
        Array.isArray(rawVector[0]) &&
        typeof rawVector[0][0] === "number") {
        return rawVector[0];
    }
    /**
     * Case 3: vector is named / object-based (rare but supported by Qdrant)
     * Example: { default: number[] }
     */
    if (typeof rawVector === "object") {
        const firstKey = Object.keys(rawVector)[0];
        const value = rawVector[firstKey];
        if (Array.isArray(value) && typeof value[0] === "number") {
            return value;
        }
        if (Array.isArray(value) &&
            Array.isArray(value[0]) &&
            typeof value[0][0] === "number") {
            return value[0];
        }
    }
    throw new Error(`Unsupported vector format for pointId ${pointId}`);
}
