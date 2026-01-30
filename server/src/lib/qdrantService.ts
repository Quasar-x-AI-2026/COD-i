import { qdrant } from "./qdrant.js";
import { randomUUID } from "crypto";

const COLLECTION = "face_embeddings";


export async function saveToQdrant(
    userId: number,
    embedding: number[],
    meta: {
        name: string;
        email: string;
        rollNumber: string;
    }
) {
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

export async function getVectorByPointId(pointId: string) {
  const result = await qdrant.retrieve(COLLECTION_NAME, {
    ids: [pointId],
    with_vector: true,
    with_payload: false,
  });

  if (!result || result.length === 0) {
    throw new Error(`Vector not found for pointId ${pointId}`);
  }

  return result[0].vector;
}

