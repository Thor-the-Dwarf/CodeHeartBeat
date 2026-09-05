import java.util.Optional;

public class OptionalBeispiel {
    public static void main(String[] args) {
        Optional<String> name = Optional.of("Grace");
        String ausgabe = name.orElse("Unbekannt");

        System.out.println("Name: " + ausgabe);
    }
}
