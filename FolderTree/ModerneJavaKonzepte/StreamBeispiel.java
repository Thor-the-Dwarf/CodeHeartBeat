import java.util.List;

public class StreamBeispiel {
    public static void main(String[] args) {
        List<Integer> zahlen = List.of(1, 2, 3, 4, 5, 6);

        List<Integer> geradeQuadrate = zahlen.stream().filter(zahl -> zahl % 2 == 0).map(zahl -> zahl * zahl).toList();

        for (int zahl : geradeQuadrate) {
            System.out.println("Quadrat: " + zahl);
        }
    }
}
