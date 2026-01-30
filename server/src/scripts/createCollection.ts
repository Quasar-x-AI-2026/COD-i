import {qdrant} from "../lib/qdrant.js"

async function main() {
  await qdrant.createCollection("face_embeddings", {
    vectors: {
      size: 512, // must match model
      distance: "Cosine",
    },
  });

  console.log("✅ face_embeddings collection created");
}

main();
