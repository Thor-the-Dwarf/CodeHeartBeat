import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class DatumUndZeit {
    public static void main(String[] args) {
        LocalDate datum = LocalDate.of(2026, 8, 27);
        DateTimeFormatter format = DateTimeFormatter.ofPattern("dd.MM.yyyy");

        System.out.println("Datum: " + datum.format(format));
        System.out.println("Morgen: " + datum.plusDays(1).format(format));
    }
}
