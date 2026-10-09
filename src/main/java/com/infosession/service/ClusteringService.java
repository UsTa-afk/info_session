package com.infosession.service;

import com.infosession.model.User;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ClusteringService {

    private double calculateDistance(List<Double> v1, List<Double> v2) {
        double sum = 0.0;
        for (int i = 0; i < v1.size(); i++) {
            sum += Math.pow(v1.get(i) - v2.get(i), 2);
        }
        return Math.sqrt(sum);
    }

    public Map<Integer, List<User>> clusterUsers(List<User> users, int maxPerTable, int maxTables) {
        Map<Integer, List<User>> tables = new HashMap<>();
        if (users == null || users.isEmpty()) {
            return tables;
        }

        int totalUsers = users.size();
        int tableCount = Math.min(maxTables, (int) Math.ceil((double) totalUsers / maxPerTable));

        for (int i = 1; i <= tableCount; i++) {
            tables.put(i, new ArrayList<>());
        }

        List<List<Double>> centers = new ArrayList<>();
        int step = Math.max(1, totalUsers / tableCount);
        for (int i = 0; i < tableCount; i++) {
            int index = Math.min(i * step, totalUsers - 1);
            centers.add(new ArrayList<>(users.get(index).getVector()));
        }

        for (int iter = 0; iter < 5; iter++) {
            for (int i = 1; i <= tableCount; i++) {
                tables.get(i).clear();
            }

            List<AssignmentCandidate> candidates = new ArrayList<>();
            for (User user : users) {
                for (int t = 0; t < tableCount; t++) {
                    double dist = calculateDistance(user.getVector(), centers.get(t));
                    candidates.add(new AssignmentCandidate(user, t + 1, dist));
                }
            }

            candidates.sort(Comparator.comparingDouble(AssignmentCandidate::getDistance));

            Set<String> assignedIds = new HashSet<>();
            for (AssignmentCandidate cand : candidates) {
                if (assignedIds.contains(cand.getUser().getId())) {
                    continue;
                }
                List<User> targetTable = tables.get(cand.getTableId());
                if (targetTable.size() < maxPerTable) {
                    cand.getUser().setTableNumber(cand.getTableId());
                    targetTable.add(cand.getUser());
                    assignedIds.add(cand.getUser().getId());
                }
                if (assignedIds.size() == totalUsers) {
                    break;
                }
            }

            for (int t = 0; t < tableCount; t++) {
                List<User> members = tables.get(t + 1);
                if (!members.isEmpty()) {
                    int dim = members.get(0).getVector().size();
                    List<Double> newCenter = new ArrayList<>();
                    for (int d = 0; d < dim; d++) {
                        double sum = 0.0;
                        for (User u : members) {
                            sum += u.getVector().get(d);
                        }
                        newCenter.add(sum / members.size());
                    }
                    centers.set(t, newCenter);
                }
            }
        }

        return tables;
    }

    private static class AssignmentCandidate {
        private final User user;
        private final int tableId;
        private final double distance;

        public AssignmentCandidate(User user, int tableId, double distance) {
            this.user = user;
            this.tableId = tableId;
            this.distance = distance;
        }

        public User getUser() {
            return user;
        }

        public int getTableId() {
            return tableId;
        }

        public double getDistance() {
            return distance;
        }
    }
}