package com.infosession.controller;

import com.infosession.dto.SurveyRequest;
import com.infosession.model.User;
import com.infosession.repository.UserRepository;
import com.infosession.service.ClusteringService;
import com.infosession.service.VectorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class SessionController {

    private final UserRepository userRepository;
    private final VectorService vectorService;
    private final ClusteringService clusteringService;

    public SessionController(UserRepository userRepository, 
                             VectorService vectorService, 
                             ClusteringService clusteringService) {
        this.userRepository = userRepository;
        this.vectorService = vectorService;
        this.clusteringService = clusteringService;
    }

    @PostMapping("/survey/submit")
    public ResponseEntity<Map<String, String>> submitSurvey(@RequestBody SurveyRequest request) {
        String userId = UUID.randomUUID().toString().substring(0, 8);
        List<Double> vector = vectorService.convertToVector(request.getAnswers());
        User user = new User(userId, request.getName(), vector);
        userRepository.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("userId", userId);
        response.put("message", "Kaydedildi");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/status/{id}")
    public ResponseEntity<?> getUserStatus(@PathVariable String id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("name", user.getName());
        response.put("tableNumber", user.getTableNumber());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/distribute")
    public ResponseEntity<Map<Integer, List<User>>> distributeTables() {
        List<User> allUsers = userRepository.findAll();
        Map<Integer, List<User>> result = clusteringService.clusterUsers(allUsers, 6, 12);
        for (List<User> tableMembers : result.values()) {
            for (User u : tableMembers) {
                userRepository.save(u);
            }
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/admin/tables")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
}