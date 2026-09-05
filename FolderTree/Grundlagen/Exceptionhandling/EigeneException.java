public class EigeneException {
    static class UngueltigesAlterException extends Exception {
        public UngueltigesAlterException(String nachricht) {
            super(nachricht);
        }
    }

    public static void pruefeAlter(int alter) throws UngueltigesAlterException {
        if (alter < 18) {
            throw new UngueltigesAlterException("Das Mindestalter ist 18.");
        }
    }

    public static void main(String[] args) {
        try {
            pruefeAlter(16);
        } catch (UngueltigesAlterException exception) {
            System.out.println("Fehler: " + exception.getMessage());
        }
    }
}
