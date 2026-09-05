public class BreakContinue {
    public static void main(String[] args) {
        for (int zahl = 1; zahl <= 8; zahl++) {
            if (zahl == 3) {
                continue;
            }
            if (zahl == 6) {
                break;
            }
            System.out.println("Zahl: " + zahl);
        }
    }
}
