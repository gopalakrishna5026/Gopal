import { getDb } from "../database";

export function listStations() {
  return getDb().stations.orderBy("name").toArray();
}
