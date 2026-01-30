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
export async function fetchEmbeddingsByUserIds(userIds) {
    const result = [];
    let offset;
    do {
        const res = await qdrant.scroll(COLLECTION, {
            with_vector: true,
            with_payload: true,
            limit: 100,
            offset,
            filter: {
                must: [
                    {
                        key: "userId",
                        match: { any: userIds }
                    }
                ]
            }
        });
        for (const p of res.points) {
            const payload = p.payload;
            if (typeof payload?.userId !== "number" ||
                typeof payload?.name !== "string" ||
                typeof payload?.rollNumber !== "string" ||
                !Array.isArray(p.vector)) {
                continue;
            }
            result.push({
                student_id: String(payload.userId),
                name: payload.name,
                roll_number: payload.rollNumber,
                embedding: p.vector
            });
        }
        offset =
            typeof res.next_page_offset === "string"
                ? res.next_page_offset
                : undefined;
    } while (offset);
    return result;
}
