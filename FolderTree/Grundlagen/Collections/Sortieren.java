import java.util.ArrayList;
import java.util.Collections;

public class Sortieren {
    public static void main(String[] args) {
        ArrayList<Integer> zahlen = new ArrayList<>();
        zahlen.add(8);
        zahlen.add(3);
        zahlen.add(12);

        Collections.sort(zahlen);
        for (int zahl : zahlen) {
            System.out.println("Sortiert: " + zahl);
        }
    }
}
