public class Wochentag {
    public static void main(String[] args) {
        int tag = 3;

        switch (tag) {
            case 1 -> System.out.println("Montag");
            case 2 -> System.out.println("Dienstag");
            case 3 -> System.out.println("Mittwoch");
            case 4 -> System.out.println("Donnerstag");
            case 5 -> System.out.println("Freitag");
            default -> System.out.println("Wochenende");
        }
    }
}
