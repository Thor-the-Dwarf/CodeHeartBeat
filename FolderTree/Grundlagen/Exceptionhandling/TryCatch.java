public class TryCatch {
    public static void main(String[] args) {
        try {
            int zahl = Integer.parseInt("kein Integer");
            System.out.println("Zahl: " + zahl);
        } catch (NumberFormatException exception) {
            System.out.println("Die Eingabe ist keine Ganzzahl.");
        }
    }
}
