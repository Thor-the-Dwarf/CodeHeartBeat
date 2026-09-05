public class MehrereCatchBloecke {
    public static void demonstrieren() {
        String eingabe = "abc";

        try {
            int zahl = Integer.parseInt(eingabe);
            System.out.println("Zahl: " + zahl);
        } catch (NumberFormatException exception) {
            System.out.println("Die Zahl hat ein ungültiges Format.");
        } catch (RuntimeException exception) {
            System.out.println("Ein anderer Laufzeitfehler ist aufgetreten.");
        }
    }
}
