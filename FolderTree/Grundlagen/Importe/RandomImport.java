import java.util.Random;

public class RandomImport {
    public static void main(String[] args) {
        Random zufall = new Random(42);
        int zahl = zufall.nextInt(10) + 1;

        System.out.println("Zufallszahl: " + zahl);
    }
}
