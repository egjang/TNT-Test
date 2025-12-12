package com.tnt.sales.graph.api;

import org.neo4j.driver.*;
import org.neo4j.driver.Record;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.*;

@RestController
@RequestMapping("/api/v1/graph")
public class GraphController {

    @Value("${neo4j.uri:neo4j://localhost:7687}")
    private String neo4jUri;

    @Value("${neo4j.username:neo4j}")
    private String neo4jUsername;

    @Value("${neo4j.password:neo4j}")
    private String neo4jPassword;

    @Value("${neo4j.database:neo4j}")
    private String neo4jDatabase;

    private Driver driver;

    @PostConstruct
    public void init() {
        try {
            driver = GraphDatabase.driver(neo4jUri, AuthTokens.basic(neo4jUsername, neo4jPassword));
            driver.verifyConnectivity();
            System.out.println("Neo4j connection established: " + neo4jUri);
        } catch (Exception e) {
            System.err.println("Failed to connect to Neo4j: " + e.getMessage());
            driver = null;
        }
    }

    @PreDestroy
    public void close() {
        if (driver != null) {
            driver.close();
        }
    }

    /**
     * Debug: Get sample customers from Neo4j
     */
    @GetMapping("/debug/customers")
    public ResponseEntity<Map<String, Object>> debugCustomers() {
        Map<String, Object> result = new HashMap<>();
        if (driver == null) {
            result.put("error", "Neo4j not connected");
            return ResponseEntity.ok(result);
        }
        try (Session session = driver.session(SessionConfig.forDatabase(neo4jDatabase))) {
            var queryResult = session
                    .run("MATCH (c:customer) RETURN c.customer_seq, c.customer_id, c.customer_name LIMIT 10");
            List<Map<String, Object>> customers = new ArrayList<>();
            while (queryResult.hasNext()) {
                var record = queryResult.next();
                Map<String, Object> cust = new HashMap<>();
                cust.put("customer_seq", record.get("c.customer_seq").asObject());
                cust.put("customer_id", record.get("c.customer_id").asObject());
                cust.put("customer_name", record.get("c.customer_name").asObject());
                customers.add(cust);
            }
            result.put("customers", customers);
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Get comprehensive graph data for a customer - insights view
     * Schema: customer, employee, sales_activity, revenue
     * Relationships: MANAGING, PERFORMED, RECEIVED_VISIT, PURCHASED
     * Supports both customerSeq (number) and customerId (string)
     */
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<Map<String, Object>> getCustomerGraph(
            @PathVariable String customerId,
            @RequestParam(required = false) Integer customerSeq) {

        try {
            if (driver == null) {
                return ResponseEntity.ok(generateSampleGraphData(customerId));
            }

            Map<String, Object> result = new HashMap<>();
            List<Map<String, Object>> nodes = new ArrayList<>();
            List<Map<String, Object>> edges = new ArrayList<>();
            Set<String> addedNodeIds = new HashSet<>();
            Set<String> addedEdgeIds = new HashSet<>();

            // Insights summary
            Map<String, Object> insights = new HashMap<>();

            try (Session session = driver.session(SessionConfig.forDatabase(neo4jDatabase))) {

                // 1. Get customer node - try by customer_seq first if provided, otherwise by
                // customer_id
                String customerQuery;
                Map<String, Object> params;

                if (customerSeq != null) {
                    customerQuery = """
                            MATCH (c:customer {customer_seq: $customerSeq})
                            OPTIONAL MATCH (e:employee)-[m:managing]->(c)
                            RETURN c, e, m
                            """;
                    params = Map.of("customerSeq", customerSeq);
                } else {
                    // Try to parse customerId as integer (customer_seq)
                    try {
                        int seq = Integer.parseInt(customerId);
                        customerQuery = """
                                MATCH (c:customer {customer_seq: $customerSeq})
                                OPTIONAL MATCH (e:employee)-[m:managing]->(c)
                                RETURN c, e, m
                                """;
                        params = Map.of("customerSeq", seq);
                    } catch (NumberFormatException e) {
                        // Use customer_id string match
                        customerQuery = """
                                MATCH (c:customer {customer_id: $customerId})
                                OPTIONAL MATCH (e:employee)-[m:managing]->(c)
                                RETURN c, e, m
                                """;
                        params = Map.of("customerId", customerId);
                    }
                }

                var customerResult = session.run(customerQuery, params);

                String customerNodeId = null;
                while (customerResult.hasNext()) {
                    Record record = customerResult.next();

                    // Customer node
                    if (!record.get("c").isNull()) {
                        var cNode = record.get("c").asNode();
                        customerNodeId = "customer_" + customerId;
                        if (!addedNodeIds.contains(customerNodeId)) {
                            Map<String, Object> node = createNodeMap(customerNodeId,
                                    getPropertyOrDefault(cNode, "customer_name", customerId),
                                    "customer", nodeToMap(cNode));
                            nodes.add(node);
                            addedNodeIds.add(customerNodeId);
                        }
                    }

                    // Managing employee
                    if (!record.get("e").isNull()) {
                        var eNode = record.get("e").asNode();
                        // Use 'emp_id' from actual schema
                        String empId = "employee_" + getPropertyOrDefault(eNode, "emp_id", eNode.elementId());
                        if (!addedNodeIds.contains(empId)) {
                            Map<String, Object> node = createNodeMap(empId,
                                    getPropertyOrDefault(eNode, "emp_name", "담당자"),
                                    "employee", nodeToMap(eNode));
                            nodes.add(node);
                            addedNodeIds.add(empId);
                        }

                        // MANAGING edge
                        String edgeId = "edge_managing_" + empId;
                        if (!addedEdgeIds.contains(edgeId) && customerNodeId != null) {
                            edges.add(createEdgeMap(edgeId, empId, customerNodeId, "담당",
                                    record.get("m").isNull() ? new HashMap<>()
                                            : relationshipToMap(record.get("m").asRelationship())));
                            addedEdgeIds.add(edgeId);
                        }
                    }
                }

                if (customerNodeId == null) {
                    // Customer not found, return sample data
                    return ResponseEntity.ok(generateSampleGraphData(customerId));
                }

                // Get customer_seq for subsequent queries
                Integer custSeq = null;
                for (var n : nodes) {
                    if ("customer".equals(n.get("type"))) {
                        var props = (Map<String, Object>) n.get("properties");
                        if (props != null && props.get("customer_seq") != null) {
                            custSeq = ((Number) props.get("customer_seq")).intValue();
                        }
                    }
                }

                // 2. Get sales activities (영업활동) - use relationship traversal
                String activityQuery = """
                        MATCH (c:customer)-[rv:RECEIVED_VISIT]->(sa:sales_activity)
                        WHERE c.customer_seq = $custSeq
                        OPTIONAL MATCH (e:employee)-[p:PERFORMED]->(sa)
                        RETURN sa, rv, e, p
                        LIMIT 10
                        """;

                var activityResult = session.run(activityQuery, Map.of("custSeq", custSeq != null ? custSeq : 0));
                int activityCount = 0;

                while (activityResult.hasNext()) {
                    Record record = activityResult.next();
                    activityCount++;

                    if (!record.get("sa").isNull()) {
                        var saNode = record.get("sa").asNode();
                        // Use 'id' field from actual schema, fallback to element id
                        String saId = "activity_" + getPropertyOrDefault(saNode, "id", saNode.elementId());

                        if (!addedNodeIds.contains(saId)) {
                            // Use 'activity_type' and 'subject' from actual schema
                            String activityType = getPropertyOrDefault(saNode, "activity_type", "활동");
                            String subject = getPropertyOrDefault(saNode, "subject", "");
                            String label = activityType + (subject.isEmpty() ? ""
                                    : "\n" + subject.substring(0, Math.min(12, subject.length())));

                            Map<String, Object> node = createNodeMap(saId, label, "sales_activity", nodeToMap(saNode));
                            nodes.add(node);
                            addedNodeIds.add(saId);
                        }

                        // RECEIVED_VISIT edge
                        String rvEdgeId = "edge_received_" + saId;
                        if (!addedEdgeIds.contains(rvEdgeId)) {
                            edges.add(createEdgeMap(rvEdgeId, customerNodeId, saId, "영업활동",
                                    record.get("rv").isNull() ? new HashMap<>()
                                            : relationshipToMap(record.get("rv").asRelationship())));
                            addedEdgeIds.add(rvEdgeId);
                        }

                        // Employee who performed
                        if (!record.get("e").isNull()) {
                            var eNode = record.get("e").asNode();
                            // Use 'emp_id' from actual schema
                            String empId = "employee_" + getPropertyOrDefault(eNode, "emp_id", eNode.elementId());

                            if (!addedNodeIds.contains(empId)) {
                                Map<String, Object> node = createNodeMap(empId,
                                        getPropertyOrDefault(eNode, "emp_name", "담당자"),
                                        "employee", nodeToMap(eNode));
                                nodes.add(node);
                                addedNodeIds.add(empId);
                            }

                            // PERFORMED edge
                            String pEdgeId = "edge_performed_" + empId + "_" + saId;
                            if (!addedEdgeIds.contains(pEdgeId)) {
                                edges.add(createEdgeMap(pEdgeId, empId, saId, "수행",
                                        record.get("p").isNull() ? new HashMap<>()
                                                : relationshipToMap(record.get("p").asRelationship())));
                                addedEdgeIds.add(pEdgeId);
                            }
                        }
                    }
                }
                insights.put("recentActivities", activityCount);

                // 3. Get revenue (매출 정보) - use customer_seq, last 90 days
                String revenueQuery = """
                        MATCH (c:customer)-[p:PURCHASED]->(r:revenue)
                        WHERE c.customer_seq = $custSeq
                        AND date(r.last_date) >= date() - duration({days: 90})
                        RETURN r, p
                        ORDER BY r.last_date DESC
                        """;

                var revenueResult = session.run(revenueQuery, Map.of("custSeq", custSeq != null ? custSeq : 0));
                double totalRevenue = 0;
                int revenueCount = 0;
                Set<String> productNames = new HashSet<>();

                while (revenueResult.hasNext()) {
                    Record record = revenueResult.next();

                    if (!record.get("r").isNull()) {
                        var rNode = record.get("r").asNode();
                        String rId = "revenue_" + rNode.elementId();
                        revenueCount++;

                        // Get product info for grouping (revenue node uses item_name)
                        String productName = getPropertyOrDefault(rNode, "item_name",
                                getPropertyOrDefault(rNode, "품명", "상품"));
                        productNames.add(productName);

                        // Add amount
                        try {
                            String amountStr = getPropertyOrDefault(rNode, "sales_amount", "0");
                            totalRevenue += Double.parseDouble(amountStr.replaceAll("[^0-9.-]", ""));
                        } catch (Exception ignored) {
                        }

                        if (!addedNodeIds.contains(rId)) {
                            String salesDate = getPropertyOrDefault(rNode, "sales_date", "");
                            String amount = getPropertyOrDefault(rNode, "sales_amount", "");
                            String label = productName.length() > 10 ? productName.substring(0, 10) + "..."
                                    : productName;
                            if (!salesDate.isEmpty()) {
                                label += "\n" + salesDate.substring(0, Math.min(10, salesDate.length()));
                            }

                            Map<String, Object> node = createNodeMap(rId, label, "revenue", nodeToMap(rNode));
                            nodes.add(node);
                            addedNodeIds.add(rId);
                        }

                        // PURCHASED edge
                        String pEdgeId = "edge_purchased_" + rId;
                        if (!addedEdgeIds.contains(pEdgeId)) {
                            edges.add(createEdgeMap(pEdgeId, customerNodeId, rId, "구매",
                                    record.get("p").isNull() ? new HashMap<>()
                                            : relationshipToMap(record.get("p").asRelationship())));
                            addedEdgeIds.add(pEdgeId);
                        }
                    }
                }

                insights.put("totalRevenue", totalRevenue);
                insights.put("transactionCount", revenueCount);
                insights.put("productVariety", productNames.size());

                // 4. Get total activity count for insights
                String totalActivityQuery = """
                        MATCH (c:customer)-[:RECEIVED_VISIT]->(sa:sales_activity)
                        WHERE c.customer_seq = $custSeq
                        RETURN count(sa) as total
                        """;
                var totalResult = session.run(totalActivityQuery, Map.of("custSeq", custSeq != null ? custSeq : 0));
                if (totalResult.hasNext()) {
                    insights.put("totalActivities", totalResult.single().get("total").asLong());
                }

                // 5. Get total revenue for insights (90 days)
                String totalRevenueQuery = """
                        MATCH (c:customer)-[:PURCHASED]->(r:revenue)
                        WHERE c.customer_seq = $custSeq
                        AND date(r.last_date) >= date() - duration({days: 90})
                        RETURN count(r) as txCount, sum(toFloat(r.sales_amount)) as total
                        """;
                var totalRevResult = session.run(totalRevenueQuery, Map.of("custSeq", custSeq != null ? custSeq : 0));
                if (totalRevResult.hasNext()) {
                    Record rec = totalRevResult.single();
                    insights.put("totalTransactions", rec.get("txCount").asLong());
                    try {
                        insights.put("totalRevenueAll", rec.get("total").asDouble());
                    } catch (Exception e) {
                        insights.put("totalRevenueAll", 0);
                    }
                }
            }

            result.put("nodes", nodes);
            result.put("edges", edges);
            result.put("insights", insights);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("nodes", Collections.emptyList());
            error.put("edges", Collections.emptyList());
            return ResponseEntity.ok(error);
        }
    }

    /**
     * Get schema information from Neo4j
     */
    @GetMapping("/schema")
    public ResponseEntity<Map<String, Object>> getSchema() {
        Map<String, Object> schema = new HashMap<>();

        if (driver == null) {
            schema.put("error", "Neo4j not connected");
            return ResponseEntity.ok(schema);
        }

        try (Session session = driver.session(SessionConfig.forDatabase(neo4jDatabase))) {
            // Get node labels
            var labelsResult = session.run("CALL db.labels()");
            List<String> labels = new ArrayList<>();
            while (labelsResult.hasNext()) {
                labels.add(labelsResult.next().get(0).asString());
            }
            schema.put("nodeLabels", labels);

            // Get relationship types
            var relResult = session.run("CALL db.relationshipTypes()");
            List<String> relTypes = new ArrayList<>();
            while (relResult.hasNext()) {
                relTypes.add(relResult.next().get(0).asString());
            }
            schema.put("relationshipTypes", relTypes);

            // Get sample properties for each label
            Map<String, List<String>> labelProps = new HashMap<>();
            for (String label : labels) {
                try {
                    var propsResult = session.run(
                            "MATCH (n:" + label + ") RETURN keys(n) as props LIMIT 1");
                    if (propsResult.hasNext()) {
                        labelProps.put(label, propsResult.next().get("props").asList(v -> v.asString()));
                    }
                } catch (Exception ignored) {
                }
            }
            schema.put("nodeProperties", labelProps);

        } catch (Exception e) {
            schema.put("error", e.getMessage());
        }

        return ResponseEntity.ok(schema);
    }

    private Map<String, Object> createNodeMap(String id, String label, String type, Map<String, Object> properties) {
        Map<String, Object> node = new HashMap<>();
        node.put("id", id);
        node.put("label", label);
        node.put("type", type);
        node.put("properties", properties);
        return node;
    }

    private Map<String, Object> createEdgeMap(String id, String source, String target, String label,
            Map<String, Object> properties) {
        Map<String, Object> edge = new HashMap<>();
        edge.put("id", id);
        edge.put("source", source);
        edge.put("target", target);
        edge.put("label", label);
        edge.put("properties", properties);
        return edge;
    }

    private String getPropertyOrDefault(org.neo4j.driver.types.Node node, String key, String defaultValue) {
        if (node.containsKey(key)) {
            try {
                return node.get(key).asString();
            } catch (Exception e) {
                try {
                    return String.valueOf(node.get(key).asObject());
                } catch (Exception e2) {
                    return defaultValue;
                }
            }
        }
        return defaultValue;
    }

    private String getNodeType(org.neo4j.driver.types.Node node) {
        for (String label : node.labels()) {
            return label.toLowerCase();
        }
        return "unknown";
    }

    private String getNodeLabel(org.neo4j.driver.types.Node node) {
        String[] labelProps = { "customer_name", "emp_name", "activity_type_name", "품명", "product_name", "name",
                "label", "title" };
        for (String prop : labelProps) {
            if (node.containsKey(prop)) {
                try {
                    return node.get(prop).asString();
                } catch (Exception ignored) {
                }
            }
        }
        return node.elementId();
    }

    private Map<String, Object> nodeToMap(org.neo4j.driver.types.Node node) {
        Map<String, Object> map = new HashMap<>();
        for (String key : node.keys()) {
            try {
                map.put(key, node.get(key).asObject());
            } catch (Exception ignored) {
            }
        }
        return map;
    }

    private Map<String, Object> relationshipToMap(org.neo4j.driver.types.Relationship rel) {
        Map<String, Object> map = new HashMap<>();
        for (String key : rel.keys()) {
            try {
                map.put(key, rel.get(key).asObject());
            } catch (Exception ignored) {
            }
        }
        return map;
    }

    /**
     * Generate sample graph data for demonstration when no Neo4j data exists
     */
    private Map<String, Object> generateSampleGraphData(String customerId) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        // Customer node (center)
        nodes.add(createNodeMap("customer_" + customerId, customerId, "customer",
                Map.of("customer_id", customerId)));

        // Sample employee (담당자)
        nodes.add(createNodeMap("employee_1", "김영업", "employee",
                Map.of("emp_name", "김영업", "dept_name", "영업1팀")));
        edges.add(createEdgeMap("edge_managing_1", "employee_1", "customer_" + customerId, "담당", new HashMap<>()));

        // Sample sales activities
        String[] activityTypes = { "방문상담", "전화상담", "견적제출", "계약협의" };
        for (int i = 0; i < activityTypes.length; i++) {
            String actId = "activity_" + i;
            nodes.add(createNodeMap(actId, activityTypes[i] + "\n2024-0" + (i + 1) + "-15", "sales_activity",
                    Map.of("activity_type_name", activityTypes[i], "activity_date", "2024-0" + (i + 1) + "-15")));
            edges.add(createEdgeMap("edge_received_" + i, "customer_" + customerId, actId, "영업활동", new HashMap<>()));
            edges.add(createEdgeMap("edge_performed_" + i, "employee_1", actId, "수행", new HashMap<>()));
        }

        // Sample revenue
        String[] products = { "맑은유리 8mm", "로이유리 6mm", "강화유리 10mm" };
        for (int i = 0; i < products.length; i++) {
            String revId = "revenue_" + i;
            nodes.add(createNodeMap(revId, products[i] + "\n2024-0" + (i + 1), "revenue",
                    Map.of("품명", products[i], "sales_amount", String.valueOf((i + 1) * 1000000), "sales_date",
                            "2024-0" + (i + 1) + "-20")));
            edges.add(createEdgeMap("edge_purchased_" + i, "customer_" + customerId, revId, "구매", new HashMap<>()));
        }

        result.put("nodes", nodes);
        result.put("edges", edges);
        result.put("_sample", true);
        result.put("insights", Map.of(
                "recentActivities", 4,
                "totalActivities", 12,
                "totalRevenue", 6000000,
                "transactionCount", 3,
                "productVariety", 3));

        return result;
    }

    /**
     * Get graph data for all customers managed by an employee
     * Shows: employee (center) -> customers -> activities/revenue
     */
    @GetMapping("/employee/{empId}/customers")
    public ResponseEntity<Map<String, Object>> getEmployeeCustomersGraph(
            @PathVariable String empId,
            @RequestParam(required = false, defaultValue = "30") Integer limit) {

        try {
            if (driver == null) {
                return ResponseEntity.ok(generateSampleEmployeeGraphData(empId));
            }

            // Parse empId to Long for numeric comparison in Neo4j (assignee_id is Integer
            // in Neo4j)
            Long empIdLong;
            try {
                empIdLong = Long.parseLong(empId);
            } catch (NumberFormatException e) {
                return ResponseEntity.ok(generateSampleEmployeeGraphData(empId));
            }

            Map<String, Object> result = new HashMap<>();
            List<Map<String, Object>> nodes = new ArrayList<>();
            List<Map<String, Object>> edges = new ArrayList<>();
            Set<String> addedNodeIds = new HashSet<>();
            Set<String> addedEdgeIds = new HashSet<>();
            Map<String, Object> insights = new HashMap<>();

            try (Session session = driver.session(SessionConfig.forDatabase(neo4jDatabase))) {

                // 1. Get employee node first (emp_id is String in employee node)
                String employeeQuery = """
                        MATCH (e:employee {emp_id: $empId})
                        RETURN e
                        LIMIT 1
                        """;

                var employeeResult = session.run(employeeQuery, Map.of("empId", empId));
                String employeeNodeId = null;

                if (employeeResult.hasNext()) {
                    Record record = employeeResult.next();
                    if (!record.get("e").isNull()) {
                        var eNode = record.get("e").asNode();
                        employeeNodeId = "employee_" + empId;
                        Map<String, Object> node = createNodeMap(employeeNodeId,
                                getPropertyOrDefault(eNode, "emp_name", "담당자"),
                                "employee", nodeToMap(eNode));
                        nodes.add(node);
                        addedNodeIds.add(employeeNodeId);
                    }
                }

                if (employeeNodeId == null) {
                    return ResponseEntity.ok(generateSampleEmployeeGraphData(empId));
                }

                // 2. Get ALL customers where assignee_id = empId (활동/매출 없어도 모든 담당 거래처)
                // 2. Pre-fetch Active Customer Seqs (Recent Activity or Revenue)
                String activeCustQuery = """
                        MATCH (c:customer {assignee_id: $empId})
                        WHERE (
                          EXISTS {
                            MATCH (c)-[:RECEIVED_VISIT]->(sa:sales_activity)
                            // Assuming all activities are relevant, or filter by date if needed
                          } OR EXISTS {
                            MATCH (c)-[p:PURCHASED]->(r:revenue)
                            WHERE date(r.last_date) >= date() - duration({days: 90})
                          }
                        )
                        RETURN c.customer_seq as custSeq
                        """;
                var activeResult = session.run(activeCustQuery, Map.of("empId", empIdLong));
                Set<String> activeCustSeqs = new HashSet<>();
                while (activeResult.hasNext()) {
                    activeCustSeqs.add(String.valueOf(activeResult.next().get("custSeq").asObject()));
                }

                // 3. Get All Customers and Filter
                String customerQuery = """
                        MATCH (c:customer {assignee_id: $empId})
                        RETURN c
                        """;
                var customerResult = session.run(customerQuery, Map.of("empId", empIdLong));
                int totalCustomerCount = 0;
                int inactiveCount = 0;

                while (customerResult.hasNext()) {
                    Record record = customerResult.next();
                    var cNode = record.get("c").asNode();
                    String custSeq = String.valueOf(getPropertyOrDefault(cNode, "customer_seq", cNode.elementId()));
                    String customerNodeId = "customer_" + custSeq;
                    totalCustomerCount++;

                    if (activeCustSeqs.contains(custSeq)) {
                        // ACTIVE CUSTOMER
                        if (!addedNodeIds.contains(customerNodeId)) {
                            Map<String, Object> custNode = createNodeMap(customerNodeId,
                                    getPropertyOrDefault(cNode, "customer_name", "거래처"),
                                    "customer", nodeToMap(cNode));
                            nodes.add(custNode);
                            addedNodeIds.add(customerNodeId);

                            String edgeId = "edge_managing_" + customerNodeId;
                            if (!addedEdgeIds.contains(edgeId)) {
                                edges.add(createEdgeMap(edgeId, employeeNodeId, customerNodeId, "담당", new HashMap<>()));
                                addedEdgeIds.add(edgeId);
                            }
                        }
                    } else {
                        // INACTIVE CUSTOMER - Add as individual node but with different type
                        if (!addedNodeIds.contains(customerNodeId)) {
                            inactiveCount++;
                            Map<String, Object> custNode = createNodeMap(customerNodeId,
                                    getPropertyOrDefault(cNode, "customer_name", "미활동 거래처"),
                                    "customer_inactive", nodeToMap(cNode)); // Generic "customer_inactive" type
                            nodes.add(custNode);
                            addedNodeIds.add(customerNodeId);

                            String edgeId = "edge_managing_" + customerNodeId;
                            if (!addedEdgeIds.contains(edgeId)) {
                                edges.add(createEdgeMap(edgeId, employeeNodeId, customerNodeId, "담당", new HashMap<>()));
                                addedEdgeIds.add(edgeId);
                            }
                        }
                    }
                }

                // (Removed Aggregation Logic) -> inactiveCount is just for stats now

                insights.put("totalCustomers", totalCustomerCount);
                insights.put("activeCustomers", activeCustSeqs.size());
                insights.put("inactiveCustomers", inactiveCount);

                // 4. Get activities for these customers
                String activityQuery = """
                        MATCH (c:customer {assignee_id: $empId})-[rv:RECEIVED_VISIT]->(sa:sales_activity)
                        RETURN c.customer_seq as custSeq, sa, rv
                        ORDER BY sa.activity_date DESC
                        """;

                var activityResult = session.run(activityQuery, Map.of("empId", empIdLong));
                int activityCount = 0;

                while (activityResult.hasNext()) {
                    Record record = activityResult.next();
                    String custSeq = String.valueOf(record.get("custSeq").asObject());
                    String customerNodeId = "customer_" + custSeq;

                    if (!record.get("sa").isNull() && addedNodeIds.contains(customerNodeId)) {
                        var saNode = record.get("sa").asNode();
                        String saId = "activity_" + getPropertyOrDefault(saNode, "id", saNode.elementId());

                        if (!addedNodeIds.contains(saId)) {
                            activityCount++;
                            String activityType = getPropertyOrDefault(saNode, "activity_type", "활동");
                            String subject = getPropertyOrDefault(saNode, "subject", "");
                            String label = activityType + (subject.isEmpty() ? ""
                                    : "\n" + subject.substring(0, Math.min(10, subject.length())));

                            Map<String, Object> actNode = createNodeMap(saId, label, "sales_activity",
                                    nodeToMap(saNode));
                            nodes.add(actNode);
                            addedNodeIds.add(saId);

                            // Activity edge (거래처 -> 활동)
                            String rvEdgeId = "edge_received_" + saId;
                            if (!addedEdgeIds.contains(rvEdgeId)) {
                                edges.add(createEdgeMap(rvEdgeId, customerNodeId, saId, "영업활동",
                                        record.get("rv").isNull() ? new HashMap<>()
                                                : relationshipToMap(record.get("rv").asRelationship())));
                                addedEdgeIds.add(rvEdgeId);
                            }
                        }
                    }
                }
                insights.put("recentActivities", activityCount);

                // 4. Get revenue (90 days) for these customers
                String revenueQuery = """
                        MATCH (c:customer {assignee_id: $empId})-[p:PURCHASED]->(r:revenue)
                        WHERE date(r.last_date) >= date() - duration({days: 90})
                        RETURN c.customer_seq as custSeq, r, p
                        ORDER BY r.last_date DESC
                        """;

                var revenueResult = session.run(revenueQuery, Map.of("empId", empIdLong));
                double totalRevenue = 0;
                int revenueCount = 0;

                while (revenueResult.hasNext()) {
                    Record record = revenueResult.next();
                    String custSeq = String.valueOf(record.get("custSeq").asObject());
                    String customerNodeId = "customer_" + custSeq;

                    if (!record.get("r").isNull() && addedNodeIds.contains(customerNodeId)) {
                        var rNode = record.get("r").asNode();
                        revenueCount++;

                        try {
                            String amountStr = getPropertyOrDefault(rNode, "sales_amount", "0");
                            totalRevenue += Double.parseDouble(amountStr.replaceAll("[^0-9.-]", ""));
                        } catch (Exception ignored) {
                        }

                        String rId = "revenue_" + rNode.elementId();
                        if (!addedNodeIds.contains(rId)) {
                            String productName = getPropertyOrDefault(rNode, "item_name",
                                    getPropertyOrDefault(rNode, "품명", "상품"));
                            String label = productName.length() > 8 ? productName.substring(0, 8) + "..." : productName;

                            Map<String, Object> node = createNodeMap(rId, label, "revenue", nodeToMap(rNode));
                            nodes.add(node);
                            addedNodeIds.add(rId);
                        }

                        String pEdgeId = "edge_purchased_" + rId;
                        if (!addedEdgeIds.contains(pEdgeId)) {
                            edges.add(createEdgeMap(pEdgeId, customerNodeId, rId, "구매",
                                    record.get("p").isNull() ? new HashMap<>()
                                            : relationshipToMap(record.get("p").asRelationship())));
                            addedEdgeIds.add(pEdgeId);
                        }
                    }
                }

                insights.put("totalRevenue", totalRevenue);
                insights.put("transactionCount", revenueCount);

                // 5. Get total counts for insights (all-time stats, but revenue is 90 days)
                String totalQuery = """
                        MATCH (c:customer {assignee_id: $empId})
                        OPTIONAL MATCH (c)-[:RECEIVED_VISIT]->(sa:sales_activity)
                        OPTIONAL MATCH (c)-[:PURCHASED]->(r:revenue) WHERE r.last_date >= datetime() - duration({days: 90})
                        RETURN count(DISTINCT c) as custCnt, count(DISTINCT sa) as actCnt, count(DISTINCT r) as revCnt, sum(toFloat(r.sales_amount)) as totalRev
                        """;
                var totalResult = session.run(totalQuery, Map.of("empId", empIdLong));
                if (totalResult.hasNext()) {
                    Record rec = totalResult.single();
                    insights.put("totalCustomersAll", rec.get("custCnt").asLong());
                    insights.put("totalActivitiesAll", rec.get("actCnt").asLong());
                    insights.put("totalTransactionsAll", rec.get("revCnt").asLong());
                    try {
                        insights.put("totalRevenueAll", rec.get("totalRev").asDouble());
                    } catch (Exception e) {
                        insights.put("totalRevenueAll", 0);
                    }
                }
            }

            result.put("nodes", nodes);
            result.put("edges", edges);
            result.put("insights", insights);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("nodes", Collections.emptyList());
            error.put("edges", Collections.emptyList());
            return ResponseEntity.ok(error);
        }
    }

    /**
     * Generate sample employee graph data
     */
    private Map<String, Object> generateSampleEmployeeGraphData(String empId) {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        // Employee node (center)
        nodes.add(createNodeMap("employee_" + empId, "담당자", "employee",
                Map.of("emp_id", empId)));

        // Sample customers
        String[] customerNames = { "(주)한국유리", "대한건설", "서울인테리어", "경기산업" };
        for (int i = 0; i < customerNames.length; i++) {
            String custId = "customer_" + (1000 + i);
            nodes.add(createNodeMap(custId, customerNames[i], "customer",
                    Map.of("customer_name", customerNames[i], "customer_seq", 1000 + i)));
            edges.add(createEdgeMap("edge_managing_" + custId, "employee_" + empId, custId, "담당", new HashMap<>()));

            // Add sample activity
            String actId = "activity_sample_" + i;
            nodes.add(createNodeMap(actId, "방문상담\n2024-0" + (i + 1), "sales_activity",
                    Map.of("activity_type", "방문상담")));
            edges.add(createEdgeMap("edge_received_" + actId, custId, actId, "영업활동", new HashMap<>()));
        }

        result.put("nodes", nodes);
        result.put("edges", edges);
        result.put("_sample", true);
        result.put("insights", Map.of(
                "totalCustomers", 4,
                "totalCustomersAll", 4,
                "recentActivities", 4,
                "totalActivitiesAll", 12,
                "totalRevenue", 15000000,
                "totalRevenueAll", 45000000,
                "transactionCount", 8,
                "totalTransactionsAll", 24));

        return result;
    }

    /**
     * Get graph statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getGraphStats() {
        Map<String, Object> stats = new HashMap<>();

        if (driver == null) {
            stats.put("totalCustomers", 0);
            stats.put("totalEmployees", 0);
            stats.put("totalActivities", 0);
            stats.put("totalRevenue", 0);
            stats.put("totalRelationships", 0);
            stats.put("connected", false);
            stats.put("neo4jUri", neo4jUri);
            stats.put("error", "Neo4j connection not established");
            return ResponseEntity.ok(stats);
        }

        try (Session session = driver.session(SessionConfig.forDatabase(neo4jDatabase))) {
            // Count nodes by label (using actual schema labels)
            var customerCount = session.run("MATCH (c:customer) RETURN count(c) as cnt").single().get("cnt").asLong();
            var employeeCount = session.run("MATCH (e:employee) RETURN count(e) as cnt").single().get("cnt").asLong();
            var activityCount = session.run("MATCH (sa:sales_activity) RETURN count(sa) as cnt").single().get("cnt")
                    .asLong();
            var revenueCount = session.run("MATCH (r:revenue) RETURN count(r) as cnt").single().get("cnt").asLong();
            var relCount = session.run("MATCH ()-[r]->() RETURN count(r) as cnt").single().get("cnt").asLong();

            stats.put("totalCustomers", customerCount);
            stats.put("totalEmployees", employeeCount);
            stats.put("totalActivities", activityCount);
            stats.put("totalRevenue", revenueCount);
            stats.put("totalRelationships", relCount);
            stats.put("connected", true);
            stats.put("neo4jUri", neo4jUri);
        } catch (Exception e) {
            stats.put("error", e.getMessage());
            stats.put("connected", false);
            stats.put("neo4jUri", neo4jUri);
        }

        return ResponseEntity.ok(stats);
    }

    /**
     * Test Neo4j connection
     */
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testConnection() {
        Map<String, Object> result = new HashMap<>();
        result.put("uri", neo4jUri);
        result.put("username", neo4jUsername);

        if (driver == null) {
            result.put("status", "DISCONNECTED");
            result.put("message", "Driver not initialized");
            return ResponseEntity.ok(result);
        }

        try {
            driver.verifyConnectivity();
            result.put("status", "CONNECTED");
            result.put("message", "Successfully connected to Neo4j");

            // Get server info
            try (Session session = driver.session(SessionConfig.forDatabase(neo4jDatabase))) {
                var serverInfo = session
                        .run("CALL dbms.components() YIELD name, versions RETURN name, versions LIMIT 1").single();
                result.put("serverName", serverInfo.get("name").asString());
                result.put("serverVersions", serverInfo.get("versions").asList());
            }
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("message", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Get all employees for the 'All Sales Employees' view
     */
    @GetMapping("/employees")
    public ResponseEntity<Map<String, Object>> getAllEmployees() {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> nodes = new ArrayList<>();

        if (driver == null) {
            // Sample data
            for (int i = 1; i <= 5; i++) {
                nodes.add(createNodeMap("employee_" + i, "영업" + i + "팀장", "employee",
                        Map.of("emp_id", String.valueOf(i), "emp_name", "영업" + i + "팀장")));
            }
            result.put("nodes", nodes);
            result.put("edges", Collections.emptyList());
            return ResponseEntity.ok(result);
        }

        try (Session session = driver.session(SessionConfig.forDatabase(neo4jDatabase))) {
            String query = """
                    MATCH (e:employee)-[:managing]->(:customer)
                    RETURN DISTINCT e
                    ORDER BY e.emp_name
                    """;

            var queryResult = session.run(query);
            int employeeCount = 0;

            while (queryResult.hasNext()) {
                Record record = queryResult.next();
                var eNode = record.get("e").asNode();
                String empId = "employee_" + getPropertyOrDefault(eNode, "emp_id", eNode.elementId());

                nodes.add(createNodeMap(empId,
                        getPropertyOrDefault(eNode, "emp_name", "담당자"),
                        "employee", nodeToMap(eNode)));
                employeeCount++;
            }

            // Calculate Insights (Count of employees)
            Map<String, Object> insights = new HashMap<>();
            insights.put("totalEmployees", employeeCount);

            // Get total managed customers count
            String countQuery = """
                    MATCH (e:employee)-[:managing]->(c:customer)
                    RETURN count(c) as totalCustomers
                    """;
            var countResult = session.run(countQuery);
            if (countResult.hasNext()) {
                insights.put("totalCustomers", countResult.single().get("totalCustomers").asLong());
            }

            // Blank values for others to ensure cards render with defaults/zeros rather
            // than hiding
            insights.put("recentActivities", 0);
            insights.put("totalRevenue", 0);

            result.put("insights", insights);
        } catch (Exception e) {
            e.printStackTrace();
            result.put("error", e.getMessage());
        }

        result.put("nodes", nodes);
        result.put("edges", Collections.emptyList());
        return ResponseEntity.ok(result);
    }
}
