import java.util.HashSet;

public class HashSetBeispiel {
    public static void main(String[] args) {
        HashSet<String> sprachen = new HashSet<>();
        sprachen.add("Java");
        sprachen.add("Python");
        sprachen.add("Java");

        System.out.println("Eindeutige Einträge: " + sprachen.size());
        for (String sprache : sprachen) {
            System.out.println("Sprache: " + sprache);
        }
    }
}
