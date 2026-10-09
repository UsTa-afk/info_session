package com.infosession.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class VectorService {

    public List<Double> convertToVector(Map<String, String> answers) {
        List<Double> vector = new ArrayList<>();

        String field = answers.getOrDefault("q1", "web");
        vector.add(field.equalsIgnoreCase("web") ? 1.0 : 0.0);
        vector.add(field.equalsIgnoreCase("mobile") ? 1.0 : 0.0);
        vector.add(field.equalsIgnoreCase("ai") ? 1.0 : 0.0);
        vector.add(field.equalsIgnoreCase("game") ? 1.0 : 0.0);

        double socialScale = Double.parseDouble(answers.getOrDefault("q2", "3"));
        vector.add((socialScale - 1.0) / 4.0);

        double expScale = Double.parseDouble(answers.getOrDefault("q3", "1"));
        vector.add((expScale - 1.0) / 4.0);

        String hobby = answers.getOrDefault("q4", "gaming");
        vector.add(hobby.equalsIgnoreCase("gaming") ? 1.0 : 0.0);
        vector.add(hobby.equalsIgnoreCase("cinema") ? 1.0 : 0.0);
        vector.add(hobby.equalsIgnoreCase("startup") ? 1.0 : 0.0);

        return vector;
    }
}