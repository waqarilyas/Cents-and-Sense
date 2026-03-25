import { filterActiveRecords, mergeRecordsLww } from "../../lib/utils/syncMerge";

describe("mergeRecordsLww", () => {
  it("keeps newest record per id by updatedAt", () => {
    const merged = mergeRecordsLww(
      [
        { id: "a", updatedAt: 10, amount: 1 },
        { id: "b", updatedAt: 20, amount: 2 },
      ],
      [
        { id: "a", updatedAt: 30, amount: 3 },
        { id: "c", updatedAt: 40, amount: 4 },
      ],
    );

    const byId = Object.fromEntries(merged.map((r) => [r.id, r]));
    expect(byId.a.amount).toBe(3);
    expect(byId.b.amount).toBe(2);
    expect(byId.c.amount).toBe(4);
  });

  it("is idempotent when replaying the same remote rows", () => {
    const local = [{ id: "a", updatedAt: 10, name: "old" }];
    const remote = [{ id: "a", updatedAt: 20, name: "new" }];

    const first = mergeRecordsLww(local, remote);
    const second = mergeRecordsLww(first, remote);

    expect(second).toEqual(first);
  });

  it("preserves tombstones when tombstone is newest", () => {
    const merged = mergeRecordsLww(
      [{ id: "a", updatedAt: 10, name: "active" }],
      [{ id: "a", updatedAt: 20, deletedAt: 20 }],
    );

    expect(merged[0].deletedAt).toBe(20);
  });
});

describe("filterActiveRecords", () => {
  it("filters tombstoned records", () => {
    const active = filterActiveRecords([
      { id: "a", updatedAt: 10 },
      { id: "b", updatedAt: 20, deletedAt: 20 },
    ]);

    expect(active).toEqual([{ id: "a", updatedAt: 10 }]);
  });
});
