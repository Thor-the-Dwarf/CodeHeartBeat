import java.util.HashMap;

public class HashMapBeispiel {
    public static void main(String[] args) {
        HashMap<String, Integer> punkte = new HashMap<>();
        punkte.put("Ada", 95);
        punkte.put("Linus", 88);

        System.out.println("Punkte von Ada: " + punkte.get("Ada"));
        for (String name : punkte.keySet()) {
            System.out.println(name + ": " + punkte.get(name));
        }
    }
}
