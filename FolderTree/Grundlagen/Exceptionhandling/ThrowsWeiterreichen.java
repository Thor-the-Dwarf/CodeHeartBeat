public class ThrowsWeiterreichen {
    public static void ladeDaten() throws Exception {
        throw new Exception("Die Beispieldatei fehlt.");
    }

    public static void main(String[] args) {
        try {
            ladeDaten();
        } catch (Exception exception) {
            System.out.println("Abgefangener Fehler: " + exception.getMessage());
        }
    }
}
