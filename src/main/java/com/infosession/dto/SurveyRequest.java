package com.infosession.dto;

import java.util.Map;

public class SurveyRequest {
    private String name;
    private Map<String, String> answers;

    public SurveyRequest() {}

    public SurveyRequest(String name, Map<String, String> answers) {
        this.name = name;
        this.answers = answers;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, String> getAnswers() {
        return answers;
    }

    public void setAnswers(Map<String, String> answers) {
        this.answers = answers;
    }
}