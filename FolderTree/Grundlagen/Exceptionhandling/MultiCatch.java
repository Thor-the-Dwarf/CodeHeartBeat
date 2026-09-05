import java.io.IOException;

public class MultiCatch {
    public static void main(String[] args) {
        try {
            if (args.length == 0) {
                throw new IOException("Keine Eingabedatei angegeben.");
            }
            Integer.parseInt(args[0]);
        } catch (IOException | NumberFormatException exception) {
            System.out.println("Eingabe konnte nicht verarbeitet werden.");
        }
    }
}
