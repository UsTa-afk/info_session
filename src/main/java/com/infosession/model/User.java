package com.infosession.model;

import java.util.List;

public class User {
    private String id;
    private String name;
    private List<Double> vector;
    private Integer tableNumber;

    public User(String id, String name, List<Double> vector) {
        this.id = id;
        this.name = name;
        this.vector = vector;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<Double> getVector() {
        return vector;
    }

    public void setVector(List<Double> vector) {
        this.vector = vector;
    }

    public Integer getTableNumber() {
        return tableNumber;
    }

    public void setTableNumber(Integer tableNumber) {
        this.tableNumber = tableNumber;
    }
}