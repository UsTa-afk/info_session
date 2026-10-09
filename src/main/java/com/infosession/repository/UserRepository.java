package com.infosession.repository;

import com.infosession.model.User;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class UserRepository {
    private final ConcurrentHashMap<String, User> storage = new ConcurrentHashMap<>();

    public User save(User user) {
        storage.put(user.getId(), user);
        return user;
    }

    public Optional<User> findById(String id) {
        return Optional.ofNullable(storage.get(id));
    }

    public List<User> findAll() {
        return new ArrayList<>(storage.values());
    }

    public void clear() {
        storage.clear();
    }
}