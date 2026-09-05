public class ArrayGrundlagen {
    public static void main(String[] args) {
        int[] zahlen = {4, 8, 15, 16, 23, 42};

        System.out.println("Erstes Element: " + zahlen[0]);
        System.out.println("Anzahl: " + zahlen.length);

        for (int zahl : zahlen) {
            System.out.println("Wert: " + zahl);
        }
    }
}
