public class TryCatchFinally {
    public static void main(String[] args) {
        String text = null;

        try {
            System.out.println("Länge: " + text.length());
        } catch (NullPointerException exception) {
            System.out.println("Auf null kann keine Methode ausgeführt werden.");
        } finally {
            System.out.println("Dieser Block wird immer ausgeführt.");
        }
    }
}
