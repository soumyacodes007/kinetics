export function createPackDraft(input) {
    const now = input.now ?? Math.floor(Date.now() / 1000);
    return {
        manifest: {
            packId: 0,
            slug: input.slug,
            title: input.title,
            shortDescription: input.shortDescription,
            packKind: input.packKind,
            tags: [...new Set(input.tags)],
            keywords: [...new Set(input.keywords)],
            priceWei: input.priceWei,
            licenseDurationDays: input.licenseDurationDays,
            previewFiles: input.previewFiles,
            currentVersion: 1,
            creator: input.creator,
            createdAt: now,
            updatedAt: now
        },
        bundle: {
            packId: 0,
            version: 1,
            packKind: input.packKind,
            files: input.files,
            knowledgeDocs: input.knowledgeDocs ?? [],
            mountInstructions: input.mountInstructions,
            changelog: input.changelog ?? "Initial version"
        }
    };
}
//# sourceMappingURL=create-pack.js.map