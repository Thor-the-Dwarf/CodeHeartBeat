public class ReturnMethode {
    public static int quadrat(int zahl) {
        return zahl * zahl;
    }

    public static void main(String[] args) {
        int ergebnis = quadrat(6);
        System.out.println("Quadrat: " + ergebnis);
    }
}
